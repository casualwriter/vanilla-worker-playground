/*****************************************************************************
* 2024/04/08 cloudflare AI worker-playground
*
* Copyright (c) 2024, Casualwriter (MIT Licensed)
* https://github.com/casualwriter/vanilla-worker-playground
*****************************************************************************/
const html=`
<!DOCTYPE html>
<head>
  <title>Vanilla AI-Playground</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>

<style>
body  { font-family: Roboto,Lato,Arial; line-height:1.5; font-size:16px; margin:0; padding:0; overflow:hidden; }
header { background: linear-gradient(to bottom right, #06c, #fc0); }
header { color:#eee; padding:12px; font-size:20px; height:45px; font-family:"Open Sans" }
#left  { float:left;  width:calc(60vw - 30px); height:calc(100vh - 100px); }
#right { float:right; width:40%; height:calc(100vh - 100px); } 
#left, #prompt, #list { border:1px solid grey; padding:6px; overflow:auto }
#list   { height:calc(100vh - 314px) }  
#list li:hover  { background:#ddd }
#menu button    { font-family:Lato,arial; border-radius:3px; border:none; padding:3px 6px}
#prompt { height:190px; padding:8px; overflow:auto; resize:vertical; display:block; width:96%; margin:3px auto; background:#eee }
.prompt { color:#322; background:#ccc; padding:6px; }
.stamp  { color:teal; font-size:70% }

@media print{
  #menu, #right { display:none!important }
  #left { position:relative; width:100%; left:0px; top:0px; border:none; height:auto; overflow:hidden }
  .prompt { border-bottom: 1px solid grey }
}

@media screen and (max-width: 800px) {
  .desktop { display:none!important }
  #list    { position:absolute; height:calc(100vh - 160px); width:100%; bottom:58px; background:#eee  }  
  #right   { position:absolute; width:auto; height:auto; bottom:10px; left:8px; right:70px; }
  #prompt  { height:1.2em; padding:10px; overflow:auto }
  #btnSend { position:absolute; height:36px; bottom:12px; right:12px; }
  #left	   { width:97%; height:calc(100vh - 154px);  }
}
</style>

<header>
  <div id=heading style="float:left">Vanilla AI-Playground<br>
    <span id=message style="color:yellow;font-size:10px">
        For Cloudflare Workder-AI (20240408c)
    </span>
  </div>
  <div id=menu style="float:right;">
    <button onclick="chat.recognition()" title="voice input">🎤</button>
    <button onclick="chat.export()" title="export conversation">Export</button>
    <button onclick="chat('list').style.display='block'" title="list AI models">Models</button>
    <button id=btnSend accesskey=s onclick="chat.submit()" title="[Alt-S] submit prompt"><b>S</b>end</button>
  </div>
</header>

<div id="content" style="margin:8px;color:#112;background:bed">
  <div id="left">
    <div id="main" style="padding:12px; max-width:960px">
       <p class=desktop><b>Submit key:</b>
       <label><input type="radio" name="submitkey" onclick="chat.hotkey='enter'" checked>[Enter]</label>
       <label><input type="radio" name="submitkey" onclick="chat.hotkey='ctrl'">[Ctrl-Enter]</label>
       </p><b>[Ctrl-P]</b> to print<br><b>[F5]</b> to new conversation
    </div>
  </div>
  <div id="right">
     <textarea id=prompt placeholder="please input prompt here.."></textarea>
     <div id="list">
        <b>AI Models</b>: 
        <span style="float:right;font-size:80%;color:teal"><b>Attention:</b> 
        <input id=attention type="number" value="0" style="width:30px" onchange="chat.attention=this.value">
        dialogues</span>        
        <ul>
          <li>@cf/google/gemma-2b-it-lora
          <li>@cf/google/gemma-7b-it-lora
          <li>@cf/meta-llama/llama-2-7b-chat-hf-lora
          <li>@cf/meta/llama-2-7b-chat-fp16
          <li>@cf/meta/llama-2-7b-chat-int8
          <li>@cf/microsoft/phi-2
          <li>@cf/mistral/mistral-7b-instruct-v0.1
          <li>@cf/mistral/mistral-7b-instruct-v0.1-vllm
          <li>@cf/mistral/mistral-7b-instruct-v0.2-lora
          <li>@cf/openchat/openchat-3.5-0106
          <li>@cf/qwen/qwen1.5-14b-chat-awq
          <li>@cf/qwen/qwen1.5-7b-chat-awq
          <li>@cf/tiiuae/falcon-7b-instruct
          <li>@cf/tinyllama/tinyllama-1.1b-chat-v1.0
          <li>@hf/google/gemma-7b-it
          <li>@hf/mistral/mistral-7b-instruct-v0.2
          <li>@hf/nousresearch/hermes-2-pro-mistral-7b
          <li>@hf/thebloke/llama-2-13b-chat-awq
        </ul>
     </div>
  </div>
</div>

<link rel="stylesheet" href="https://casualwriter.github.io/dist/casual-markdown.css">
<script src="https://casualwriter.github.io/dist/casual-markdown.js"></script>

<script>
/*****************************************************************************
* 2024/04/08 cloudflare AI worker-playground. HTML VERSION
*
* Copyright (c) 2024, Casualwriter (MIT Licensed)
* https://github.com/casualwriter/vanilla-worker-playground
*****************************************************************************/
const chat = (id) => window.document.getElementById(id);

// Set the API endpoint URL
chat.headers = { "Content-Type": "application/json" }  
chat.endpoint  = "/ai/run/";
chat.model = "@cf/mistral/mistral-7b-instruct-v0.1" 
chat.attention = 0
chat.history = []

// send to ccloudflare API
chat.send = function (prompt) {
  chat.body = { prompt: prompt }
  chat.result = ''
  fetch( chat.endpoint + chat.model, { method:'POST', body:JSON.stringify(chat.body) } )
  .then(response => response.json() )
  .then(json => {
    console.log(json)
     if ((chat.json = json).success) {
        chat.result = chat.json.result.response
        chat.onmessage(chat.result)
        chat.oncomplete(chat.result)
     }	 
  })
  .catch(error => console.error(error));
}

// stream result from openai
chat.stream = function (prompt) {

  chat.result = ''
  chat.body = { stream:true, messages: [ { role: "user", content: prompt} ] }
  chat.controller = new AbortController();
  const signal = chat.controller.signal
   
  for (let i=chat.history.length-1; i>=0&&i>(chat.history.length-chat.attention); i--) {
    chat.body.messages.unshift( { role:'assistant', content: chat.history[i].result } );
    chat.body.messages.unshift( { role:'user', content: chat.history[i].prompt } );
  }
  
  fetch( chat.endpoint + chat.model, { method:'POST', body: JSON.stringify(chat.body), signal } )
  .then( response => { 
  
    if (!response.ok) {
        if (response.status == 401) throw new Error('401 Unauthorized, invalide API Key');
        throw new Error('failed to get data, error status '+response.status)
    }
    
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    
    reader.read().then( function processText({ done, value }) {
    
      if (done) return chat.oncomplete(chat.result);
      const lines = (chat.value=value).split('\\n');

      for (let i in lines) {
        if (lines[i].length === 0) continue;     // ignore empty message
        if (lines[i] === '\\r') continue;     // ignore empty message
        if (lines[i] === 'data: [DONE]') return chat.oncomplete(chat.result); // end of message
        try {
          chat.json = JSON.parse(lines[i].substring(6));
          if (chat.json.response) chat.result += chat.json.response;
        } catch (error) {
          chat.error = error
          console.error( 'Error: ' + error.message, chat.error.value = value )
        }
      }

      chat.onmessage(chat.result)
      return reader.read().then(processText);
       
    } )
    
  } ).catch( error => chat.onerror(error) );
  
}

// default error handle
chat.onerror = (error) => { alert(error);  };

// export conversation
chat.export = (fname) => {
  const link = document.createElement('a');
  link.href = 'data:text/plain;charset=utf-8,' 
  chat.history.forEach( (x) => { 
    link.href += encodeURIComponent('### '+x.prompt+'\\n\\n'+x.result+'\\n\\n') 
  } );  
  link.download = fname||('chat-'+new Date().toISOString().substr(0,16))+'.md';
  link.click();
} 

//================= main program ===================
// display result when receiving message
chat.onmessage = function (text) {
  chat("message").innerHTML = 'receiving messages..'
  chat("receiving").innerHTML = md.html(text + '<br><br>');
}

// show whole conversation when message completed
chat.oncomplete = (text) => {
  let html1=''
  chat("message").innerHTML = '(model: '+ chat.model + ')'
  chat.history.push( { prompt: chat.prompt, result: chat.result, model:chat.model, time: Date() } )
  
  for (let i=0; i<chat.history.length; i++) {
     html1 += '<h4 class=prompt id=prompt'+i+' ondblclick="chat.clipboard('+i+')" title="doubleclick to copy">' 
     html1 += chat.history[i].prompt + '</h4>\\n' + chat.history[i].result + '\\n\\n'
     html1 += '<p class=stamp>model: ' + chat.history[i].model + ', time: ' + chat.history[i].time.toString() + '</p>'
  }
  
  html1 += '<div><button style="float:left" onclick="chat.redo()">Redo</button>'
  html1 += '<button style="float:right;margin-left:8px" onclick="chat.speak()">🔊 speak</button>'
  html1 += '<button style="float:right" onclick="chat.clipboard(' + (chat.history.length-1)+ ')">Copy</button>'
  
  chat("main").innerHTML = md.html(html1) + '<br></div>'
  chat("left").scrollTop = chat("left").scrollHeight;
  chat("btnSend").innerHTML = '<b>S</b>end'
  
  if (document.body.clientWidth > 800) {
    chat('prompt').select()
    chat('prompt').focus();
  } else {
    chat('prompt').value = ''
  }  
}

// abort fetch request.
chat.abort = () => { 
  chat.controller.abort()
  chat("receiving").innerHTML += '\\n<font color=red>Message Aborted!</font>'
  chat("receiving").id = 'abort';
};

// submit prompt
chat.submit = () => {
  if (chat("btnSend").innerText === 'Stop..') {
    chat.abort()
    chat("btnSend").innerText = 'Send'
  } else if (chat('prompt').value) {
    chat.stream( chat.prompt = chat('prompt').value )
    chat("main").innerHTML += '<h4 class=prompt>' + chat.prompt + '</h4>\\n<div id=receiving>Receiving....</div>'
    chat("left").scrollTop = chat("left").scrollHeight;
    chat("btnSend").innerText = 'Stop..'
  }  
}

chat.clipboard = (i) => {
  navigator.clipboard.writeText( '### '+ chat.history[i].prompt + '\\n\\n' + chat.history[i].result )
  chat("message").innerText = 'dialogue has been copied to clipboard'
}

// add submit hot-key of ctrl-enter
document.addEventListener('keydown', function(event) {
  if ( event.key==='Enter' && (chat.hotkey!='ctrl'||event.ctrlKey)) {
    if (chat("btnSend").innerText === 'Send') { 
      event.preventDefault(); 
      chat.submit(); 
    }
  }  
});

// redo. submit latest prompt
chat.redo = () => {
  chat.history.pop()
  chat('prompt').value = chat.prompt
  chat.submit()
}

// speak the latest answer
chat.speak = (i)  => {
  if (window.speechSynthesis.speaking) {
     window.speechSynthesis.cancel();
  } else {
    i = ( i>=0? i : chat.history.length-1 )
    const utterance = new SpeechSynthesisUtterance(chat.history[i].result);
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  }
}

// voice recognition
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
chat.speech = new SpeechRecognition();

chat.speech.onresult = e => chat('prompt').value = e.results[0][0].transcript;

chat.recognition = () => {
  chat.speech.start()
  chat('prompt').value = 'Listening...'
}   

// on window load
window.onload = () => {
  document.querySelectorAll('#list li').forEach( (element) => {
    element.addEventListener('click', (event) => {
      chat.model = element.innerText
      chat('message').innerHTML = 'select model: ' + chat.model + ' @' + chat.attention
      if (window.innerWidth<800) chat('list').style.display = 'none'
    });
  })
  chat('prompt').focus();
};
</script>
`;

async function handleRequest(request, env) {
  if (request.method === 'GET') {
    const pageRequest = new Response( html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } } );       
    pageRequest.headers.set('Access-Control-Allow-Origin', '*');
    return pageRequest;
  } else {
      return proxy(request, env);
  }
}

async function proxy(request, env) {

  const url = new URL(request.url);
  //url.host = 'api.openai.com'; 
  url.host = 'api.cloudflare.com' 
  url.pathname = '/client/v4/accounts/' + env.CLOUDFLARE_AC_ID + url.pathname

  const modifiedRequest = new Request(url.toString(), {
    headers: request.headers,
    method: request.method,
    body: request.body,
    redirect: 'follow'
  });

  modifiedRequest.headers.set('Authorization', `Bearer ${env.CLOUDFLARE_API_KEY}` );  
  
  const response = await fetch(modifiedRequest);
  const modifiedResponse = new Response(response.body, response);

  // allow cross-region request
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');

  return modifiedResponse;
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env).catch(err => new Response(err || 'Unknown reason', { status: 403 }))
  }
};
