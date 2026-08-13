/*
Simple email worker for queued requests.
Expose POST /enqueue-email to receive JSON email payloads and append them to a local queue.
A background loop processes the queue with nodemailer using SMTP env vars.

Env vars:
  SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false), SMTP_USER, SMTP_PASS, FROM_ADDRESS, PORT

This is a minimal example — for production use a durable queue (Redis/SQS/DB) and stronger error handling.
*/

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

const QUEUE_FILE = path.join(__dirname, 'email_queue.json');
const PORT = process.env.PORT || 3000;

async function ensureQueue(){
  try{
    await fs.access(QUEUE_FILE);
  }catch(e){
    await fs.writeFile(QUEUE_FILE, JSON.stringify([]), 'utf8');
  }
}

async function readQueue(){
  try{
    const raw = await fs.readFile(QUEUE_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  }catch(e){
    return [];
  }
}

async function writeQueue(queue){
  await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
}

async function enqueueEmail(item){
  const queue = await readQueue();
  queue.push({...item, _created_at: new Date().toISOString(), _attempts: 0});
  await writeQueue(queue);
}

function createTransport(){
  const host = process.env.SMTP_HOST;
  if(!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined });
}

async function processNext(){
  const queue = await readQueue();
  if(!queue || queue.length===0) return;
  const item = queue[0];
  const transporter = createTransport();
  if(!transporter){
    console.error('SMTP not configured (set SMTP_HOST). Retrying later.');
    return;
  }
  const from = process.env.FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@example.com';
  const mail = {
    from,
    to: item.to,
    subject: item.subject || '(no subject)',
    text: item.text || undefined,
    html: item.html || undefined,
    attachments: item.attachments || undefined
  };

  try{
    await transporter.sendMail(mail);
    console.log('Email sent to', item.to);
    // remove first item
    queue.shift();
    await writeQueue(queue);
  }catch(err){
    console.error('Failed to send email:', err && err.message ? err.message : err);
    item._attempts = (item._attempts || 0) + 1;
    if(item._attempts >= (item._maxRetries || 5)){
      console.error('Dropping email after max attempts:', item._attempts, item.to);
      queue.shift(); // drop it
    }else{
      // backoff: move item to end and wait
      queue.shift();
      queue.push(item);
    }
    await writeQueue(queue);
  }
}

async function startWorkerLoop(){
  await ensureQueue();
  // process every 5s
  setInterval(() => {
    processNext().catch(e=> console.error('worker error', e));
  }, Number(process.env.WORKER_INTERVAL_MS || 5000));
}

const app = express();
app.use(bodyParser.json({limit:'1mb'}));

app.post('/enqueue-email', async (req, res) => {
  const body = req.body || {};
  if(!body.to){
    return res.status(400).json({error:'missing to'});
  }
  // accept subject, text, html, attachments
  try{
    await enqueueEmail(body);
    return res.status(202).json({status:'enqueued'});
  }catch(e){
    console.error('enqueue error', e);
    return res.status(500).json({error:'enqueue_failed'});
  }
});

app.get('/health', (req,res)=> res.json({ok:true}));

app.listen(PORT, ()=>{
  console.log('Email worker listening on', PORT);
  startWorkerLoop().catch(e=> console.error('worker init failed', e));
});
