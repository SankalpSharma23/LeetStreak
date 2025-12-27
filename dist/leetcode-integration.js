(function(){"use strict";(function(){console.log("LeetStreak: Content script loaded");let d=!1,m=null,g=!1,l=null;function S(){return window.location.pathname.startsWith("/problems/")&&window.location.pathname!=="/problems/"}function h(){try{const e=document.querySelector('[data-cy="question-title"]')||document.querySelector('div[class*="text-title"]'),t=e?e.textContent.trim():"Unknown Problem",n=window.location.pathname.split("/problems/")[1]?.split("/")[0]||"",r=document.querySelector("div[diff]")||document.querySelector('[class*="text-difficulty"]'),o=r?r.textContent.trim():"Medium",s=document.querySelector('[data-track-load="description_content"]')||document.querySelector('[class*="elfjS"]'),i=s?s.textContent.trim().substring(0,500):"",c=t.match(/^(\d+)\./),u=c?c[1]:"";return{title:t,slug:n,difficulty:o,description:i,number:u,url:window.location.href}}catch(e){return console.error("Error extracting problem data:",e),null}}function L(){try{const e=document.querySelectorAll(".view-lines");if(e.length>0)return Array.from(e[0].querySelectorAll(".view-line")).map(r=>r.textContent).join(`
`);const t=document.querySelector('textarea[class*="code"]');return t?t.value:""}catch(e){return console.error("Error extracting code:",e),""}}function C(){try{const e=document.querySelector('button[id*="lang"]')||document.querySelector('[class*="lang-select"]');return e?e.textContent.trim():"Python"}catch{return"Python"}}function v(e,t,n,r=!1){const o=document.createElement("button");o.className=r?"leetstreak-floating-btn":"leetstreak-btn";const s=r?"linear-gradient(135deg, #ffa116 0%, #f89f1b 50%, #ffc01e 100%)":"linear-gradient(135deg, #ffa116 0%, #f89f1b 100%)";if(o.innerHTML=`
      <span class="icon" style="display: inline-block; transition: transform 0.3s ease;">${t}</span>
      <span class="text">${e}</span>
    `,r)o.style.cssText=`
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px 24px;
        background: ${s};
        color: #1a1a1a;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(255, 161, 22, 0.35);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: 0.3px;
        text-transform: none;
      `;else{o.style.cssText=`
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 16px;
        margin-left: 10px;
        background: ${s};
        color: #1a1a1a;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(255, 161, 22, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: 0.2px;
        position: relative;
        overflow: hidden;
        text-transform: none;
      `;const i=document.createElement("span");i.style.cssText=`
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.5s ease;
      `,o.appendChild(i),o.addEventListener("mouseenter",()=>{i.style.left="100%"})}return o.addEventListener("mouseenter",()=>{r?(o.style.transform="translateY(-2px)",o.style.boxShadow="0 6px 16px rgba(255, 161, 22, 0.45)"):(o.style.transform="translateY(-1px)",o.style.boxShadow="0 4px 12px rgba(255, 161, 22, 0.4)"),o.querySelector(".icon").style.transform="scale(1.1)"}),o.addEventListener("mouseleave",()=>{o.style.transform="translateY(0)",r?o.style.boxShadow="0 4px 12px rgba(255, 161, 22, 0.35)":o.style.boxShadow="0 2px 8px rgba(255, 161, 22, 0.3)",o.querySelector(".icon").style.transform="scale(1)"}),o.addEventListener("mousedown",()=>{o.style.transform="translateY(0) scale(0.98)"}),o.addEventListener("mouseup",()=>{r?o.style.transform="translateY(-2px)":o.style.transform="translateY(-1px)"}),o.addEventListener("click",i=>{const c=document.createElement("span"),u=o.getBoundingClientRect(),p=Math.max(u.width,u.height),X=i.clientX-u.left-p/2,Z=i.clientY-u.top-p/2;if(c.style.cssText=`
        position: absolute;
        width: ${p}px;
        height: ${p}px;
        left: ${X}px;
        top: ${Z}px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
      `,!document.getElementById("leetstreak-ripple-animation")){const w=document.createElement("style");w.id="leetstreak-ripple-animation",w.textContent=`
          @keyframes ripple {
            to {
              transform: scale(4);
              opacity: 0;
            }
          }
        `,document.head.appendChild(w)}o.appendChild(c),setTimeout(()=>c.remove(),600),n(i)}),o}function f(){try{return typeof chrome<"u"&&typeof chrome.storage<"u"&&typeof chrome.storage.local<"u"}catch{return!1}}async function y(e){if(!f())throw a("⚠️ Extension reloaded. Please refresh this page (F5).","error"),new Error("Extension context invalidated");try{return await chrome.storage.local.get(e)}catch(t){const n=t.message||t.toString()||"";throw n.includes("Extension context invalidated")||n.includes("context invalidated")||n.includes("message port closed")||!f()?(a("⚠️ Extension reloaded. Please refresh this page (F5) to continue.","error"),new Error("Extension context invalidated")):t}}async function k(e){if(!f())throw a("⚠️ Extension reloaded. Please refresh this page (F5).","error"),new Error("Extension context invalidated");try{return await chrome.storage.local.set(e)}catch(t){const n=t.message||t.toString()||"";throw n.includes("Extension context invalidated")||n.includes("context invalidated")||n.includes("message port closed")||!f()?(a("⚠️ Extension reloaded. Please refresh this page (F5) to continue.","error"),new Error("Extension context invalidated")):t}}async function q(){if(m=h(),!m){a("❌ Could not extract problem data","error");return}try{const e=await new Promise((t,n)=>{try{if(typeof chrome>"u"||!chrome.runtime||!chrome.runtime.sendMessage){n(new Error("Extension not available"));return}chrome.runtime.sendMessage({type:"ADD_TO_QUEUE",problemData:m},r=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):t(r)})}catch(r){n(r)}});if(e.success){const t=e.status==="completed"?"✅ Added to queue! (Already Submitted ✓)":"✅ Added to queue!";a(t,"success")}else e.alreadyExists?a("📋 Already in queue!","info"):a("❌ "+(e.error||"Failed to add to queue"),"error")}catch(e){console.error("Error adding to queue:",e);const t=e.message||e.toString()||"";t.includes("Extension context invalidated")||t.includes("message port closed")||t.includes("Extension not available")?a("⚠️ Extension reloaded. Please refresh this page (F5).","error"):a("❌ Failed to add to queue: "+t.substring(0,50),"error")}}async function A(){m=h();const e=L(),t=C();if(!e){a("❌ No code found. Write some code first!","error");return}a("📸 Generating screenshot...","info"),T(m,e,t)}function T(e,t,n){const r=document.getElementById("leetstreak-screenshot-modal");r&&r.remove();const o=document.createElement("div");o.id="leetstreak-screenshot-modal",o.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;const s=document.createElement("div");s.style.cssText=`
      background: white;
      border-radius: 16px;
      max-width: 900px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `,s.innerHTML=j(e,t,n),o.appendChild(s),document.body.appendChild(o),o.addEventListener("click",i=>{i.target===o&&o.remove()}),setTimeout(()=>{document.getElementById("leetstreak-close-modal")?.addEventListener("click",()=>{o.remove()}),document.getElementById("leetstreak-download-screenshot")?.addEventListener("click",()=>{B(e.title)})},100)}function j(e,t,n){const r={easy:"#22c55e",medium:"#eab308",hard:"#ef4444"},o=r[e.difficulty.toLowerCase()]||r.medium;return`
      <div style="padding: 40px; background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); min-height: 100vh;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
          <h2 style="margin: 0; font-size: 32px; color: #1e293b; font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 800; letter-spacing: -0.5px;">
            Code Screenshot
          </h2>
          <button id="leetstreak-close-modal" style="
            background: #e2e8f0;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #64748b;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            transition: all 0.2s ease;
            font-weight: 300;
          " onmouseover="this.style.background='#cbd5e1'; this.style.color='#475569';" 
             onmouseout="this.style.background='#e2e8f0'; this.style.color='#64748b';">×</button>
        </div>
        
        <!-- Screenshot Content -->
        <div id="leetstreak-screenshot-content" style="
          background: linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #ec4899 100%);
          border-radius: 28px;
          padding: 48px;
          color: #ffffff;
          font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          box-shadow: 0 25px 70px rgba(30, 64, 175, 0.4);
        ">
          <!-- Problem Header -->
          <div style="margin-bottom: 36px;">
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px;">
              <span style="
                background: ${o};
                padding: 8px 18px;
                border-radius: 14px;
                font-size: 14px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: white;
                box-shadow: 0 6px 16px ${o}50;
                font-family: 'Inter', sans-serif;
              ">${e.difficulty}</span>
              ${e.number?`<span style="opacity: 0.95; font-size: 16px; font-weight: 700; font-family: 'Inter', sans-serif;">#${e.number}</span>`:""}
            </div>
            <h1 style="margin: 0; font-size: 36px; font-weight: 900; line-height: 1.2; color: #ffffff; font-family: 'Inter', sans-serif; letter-spacing: -0.8px;">
              ${e.title}
            </h1>
          </div>
          
          <!-- Code Block -->
          <div style="
            background: rgba(0, 0, 0, 0.35);
            border-radius: 20px;
            padding: 28px;
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.15);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.15);">
              <span style="font-size: 15px; opacity: 1; font-weight: 800; color: ${o}; font-family: 'Inter', sans-serif; letter-spacing: 0.5px;">${n}</span>
              <span style="font-size: 14px; opacity: 0.85; font-weight: 600; font-family: 'Inter', sans-serif;">${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
            </div>
            <pre style="
              margin: 0;
              font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', monospace;
              font-size: 16px;
              line-height: 2;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
              color: #f8fafc;
              font-weight: 500;
            ">${M(t)}</pre>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 36px; display: flex; justify-content: space-between; align-items: center; opacity: 0.95; font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif;">
            <span style="color: ${o}; font-size: 16px;">🔥 LeetStreak</span>
            <span style="font-weight: 600;">leetcode.com</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 16px; margin-top: 40px; justify-content: center;">
          <button id="leetstreak-download-screenshot" style="
            padding: 16px 36px;
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
            color: white;
            border: none;
            border-radius: 18px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
            font-family: 'Inter', 'SF Pro Display', sans-serif;
            letter-spacing: 0.3px;
          " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px rgba(20, 184, 166, 0.5)';" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(20, 184, 166, 0.4)';"
             onmousedown="this.style.transform='translateY(-1px)';"
             onmouseup="this.style.transform='translateY(-3px)';">
            💾 Download PNG
          </button>
        </div>
      </div>
    `}function M(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}async function B(e){try{const t=document.getElementById("leetstreak-screenshot-content");if(!t){a("❌ Screenshot element not found","error");return}a("📸 Generating screenshot...","info");let n=0;for(;typeof html2canvas>"u"&&n<15;)await new Promise(r=>setTimeout(r,200)),n++;typeof html2canvas>"u"&&await new Promise((r,o)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",s.onload=()=>{console.log("html2canvas loaded from CDN"),r()},s.onerror=()=>o(new Error("Failed to load html2canvas")),document.head.appendChild(s)}).catch(()=>{a("❌ Please refresh the page to enable downloads","error")}),await F(t,e)}catch(t){console.error("Download error:",t),a("❌ Download failed: "+(t.message||"Unknown error"),"error")}}async function F(e,t){try{if(typeof html2canvas>"u"&&(a("❌ html2canvas not available. Loading...","info"),await new Promise(r=>setTimeout(r,500)),typeof html2canvas>"u")){a("❌ Please refresh the page to enable downloads","error");return}a("📸 Capturing screenshot...","info"),(await html2canvas(e,{backgroundColor:"#1e40af",scale:2,logging:!1,useCORS:!0,allowTaint:!1,foreignObjectRendering:!1,removeContainer:!1,imageTimeout:15e3,onclone:r=>{const o=r.getElementById("leetstreak-screenshot-content");o&&(o.style.visibility="visible")}})).toBlob(r=>{if(!r){a("❌ Failed to generate image blob","error");return}try{const o=URL.createObjectURL(r),s=document.createElement("a"),i=(t||"code_screenshot").replace(/[^a-z0-9]/gi,"_").substring(0,50);s.download=`${i}_${Date.now()}.png`,s.href=o,s.style.display="none",document.body.appendChild(s),s.click(),setTimeout(()=>{try{document.body.contains(s)&&document.body.removeChild(s),URL.revokeObjectURL(o)}catch(c){console.error("Cleanup error:",c)}},100),a("✅ Downloaded successfully!","success")}catch(o){console.error("Download link error:",o),a("❌ Download failed: "+o.message,"error")}},"image/png",.95)}catch(n){console.error("Download processing error:",n);const r=n.message||"Unknown error";a("❌ Download failed: "+r,"error")}}function a(e,t="info"){const n=document.getElementById("leetstreak-notification");n&&n.remove();const r={success:"#10b981",error:"#ef4444",info:"#667eea"},o=document.createElement("div");o.id="leetstreak-notification",o.textContent=e,o.style.cssText=`
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${r[t]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideInRight 0.3s ease;
    `,document.body.appendChild(o),setTimeout(()=>{o.style.animation="slideOutRight 0.3s ease",setTimeout(()=>o.remove(),300)},3e3)}function x(){try{if(d)return;if(console.log("LeetStreak: Attempting to inject buttons..."),document.getElementById("leetstreak-buttons")){console.log("LeetStreak: Buttons already exist"),d=!0;return}let e=null;try{const o=document.querySelector('[data-e2e-locator*="console"]');o&&o.parentElement&&(e=o.parentElement.parentElement,console.log("LeetStreak: Found via testid"))}catch{}if(!e)try{const s=Array.from(document.querySelectorAll("button")).find(i=>{try{return i&&i.textContent&&(i.textContent.includes("Submit")||i.textContent.includes("Run")||i.textContent.includes("Test"))}catch{return!1}});s&&s.parentElement&&(e=s.parentElement,console.log("LeetStreak: Found via submit button"))}catch{}if(!e)try{const o=document.querySelectorAll('div[class*="flex"]');for(const s of o)try{if(s&&s.querySelectorAll&&s.querySelectorAll("button").length>=2&&s.offsetHeight>30){e=s,console.log("LeetStreak: Found via flex container");break}}catch{continue}}catch{}if(!e)try{const o=document.querySelectorAll('[class*="header"], [class*="toolbar"]');o.length>0&&o[0]&&(e=o[0],console.log("LeetStreak: Found via header"))}catch{}if(!e){console.log("LeetStreak: Could not find injection point. Will retry...");return}console.log("LeetStreak: Found injection point:",e);const t=document.createElement("div");t.id="leetstreak-buttons",t.style.cssText=`
        display: inline-flex;
        gap: 8px;
        align-items: center;
        margin-left: 12px;
        z-index: 100;
      `;const n=v("Add to Queue",'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="15" y1="10" x2="9" y2="10"/></svg>',q),r=v("Code Screenshot",'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',A);t.appendChild(n),t.appendChild(r),e.appendChild(t),d=!0,console.log("LeetStreak: Buttons injected successfully!")}catch(e){console.error("LeetStreak: Error in injectButtons:",e)}}async function D(){const e=[I,P,$];for(let t=0;t<3;t++){for(const n of e)try{const r=await n();if(r&&r.trim().length>0)return{success:!0,code:r.trim(),method:n.name}}catch{}t<2&&await new Promise(n=>setTimeout(n,200))}return{success:!1,code:null}}function I(){if(typeof window.monaco>"u"||!window.monaco.editor)throw new Error("Monaco not available");const e=window.monaco.editor.getModels();if(!e||e.length===0)throw new Error("No models");const n=(e.find(r=>!r.uri.toString().includes("test"))||e[0]).getValue();if(!n)throw new Error("Empty");return n}function P(){const e=document.querySelector(".monaco-editor textarea")||document.querySelector("textarea");if(e&&e.value)return e.value;throw new Error("No textarea")}function $(){const e=document.querySelectorAll(".view-lines .view-line");if(e.length>0)return Array.from(e).map(t=>t.textContent).join(`
`);throw new Error("No visible lines")}function z(){try{if(window.monaco&&window.monaco.editor){const t=window.monaco.editor.getModels();if(t.length>0){const n=t[0].getLanguageId();if(n)return b(n)}}}catch{}const e=document.querySelector("[data-mode-id]")||document.querySelector(".ant-select-selection-item");if(e){const t=e.getAttribute("data-mode-id")||e.textContent;if(t)return b(t)}try{const t=localStorage.getItem("global_lang");if(t){const n=JSON.parse(t);if(n.lang)return b(n.lang)}}catch{}return"python3"}function b(e){return{python:"python3",py:"python3",javascript:"javascript",js:"javascript",typescript:"typescript",java:"java","c++":"cpp",cpp:"cpp",c:"c",csharp:"csharp",go:"go",rust:"rust"}[e.toLowerCase()]||e.toLowerCase()}function H(e){return{python3:"py",javascript:"js",typescript:"ts",java:"java",cpp:"cpp",c:"c",csharp:"cs",go:"go",rust:"rs",swift:"swift",kotlin:"kt"}[e]||"txt"}async function E(){try{const e=await y(["github_sync_enabled","github_token"]);e.github_sync_enabled&&e.github_token?(g=!0,console.log("LeetStreak: GitHub sync is enabled"),U()):console.log("LeetStreak: GitHub sync is disabled")}catch(e){console.error("LeetStreak: Failed to initialize GitHub sync:",e)}}function U(){console.log("LeetStreak: Setting up submit button listener..."),document.addEventListener("click",async e=>{try{const n=e.target.closest("button");if(!n)return;const r=n.textContent||"";(r.includes("Submit")&&!r.includes("Submission")&&n.getAttribute("data-e2e-locator")==="console-submit-button"||r.trim()==="Submit"&&!n.disabled)&&g&&(console.log("🚀 LeetStreak: Submit button clicked! Capturing code..."),await _())}catch(t){if(t.message&&t.message.includes("Extension context invalidated"))return;console.error("LeetStreak: Error in submit button listener:",t)}},!0),console.log("LeetStreak: Submit button listener active")}async function _(){try{console.log("LeetStreak: Starting code capture...");const e=await D();if(console.log("LeetStreak: Code capture result:",e.success?"SUCCESS":"FAILED"),!e.success){console.warn("LeetStreak: Code capture failed"),a("⚠️ Could not capture code","error");return}console.log("LeetStreak: Code captured:",e.code.length,"characters");const t=z(),n=H(t);console.log("LeetStreak: Detected language:",t);const r=G();if(!r){console.warn("LeetStreak: Failed to extract problem metadata"),a("⚠️ Could not extract problem data","error");return}console.log("LeetStreak: Problem data:",r.title);const o={code:e.code,language:t,extension:n,problemTitle:r.title,problemSlug:r.slug,difficulty:r.difficulty,topics:r.topics||["Unsorted"],questionNumber:r.number,problemUrl:window.location.href,timestamp:Date.now(),captureMethod:e.method},s=`pending_${r.slug}_${Date.now()}`;await k({[s]:o}),console.log("✅ LeetStreak: Code captured and stored as pending:",s),a("📝 Code captured! Waiting for result...","info"),N(s,o)}catch(e){console.error("❌ LeetStreak: Submission capture failed:",e),a("❌ Capture failed: "+e.message,"error")}}function G(){try{const e=h();if(!e)return null;const t=R();return{...e,topics:t.length>0?t:["Unsorted"]}}catch(e){return console.error("Error extracting problem metadata:",e),null}}function R(){const e=[];try{document.querySelectorAll('[class*="topic-tag"]').forEach(n=>{const r=n.textContent.trim();r&&e.push(r)}),e.length===0&&document.querySelectorAll('a[href*="/tag/"]').forEach(r=>{const o=r.textContent.trim();o&&e.push(o)}),e.length===0&&document.querySelectorAll("script").forEach(r=>{if(r.textContent.includes('"topicTags"'))try{const o=r.textContent.match(/"topicTags":\s*\[([^\]]+)\]/);if(o){const i=o[1].matchAll(/"name":"([^"]+)"/g);for(const c of i)e.push(c[1])}}catch{}})}catch(t){console.warn("Error extracting topics:",t)}return[...new Set(e)]}function N(e,t){console.log("LeetStreak: Starting submission watcher..."),l&&l.disconnect();const n=300*1e3,r=Date.now();l=new MutationObserver(async s=>{if(Date.now()-r>n){console.log("⏱️ LeetStreak: Submission watch timeout"),l.disconnect(),await V(e);return}Y()&&(console.log("✅ LeetStreak: Submission ACCEPTED! Triggering GitHub sync..."),l.disconnect(),a("✅ Accepted! Syncing to GitHub...","success"),await W(e,t)),O()&&(console.log("❌ LeetStreak: Submission failed, discarding"),l.disconnect(),await Q(e))}),[document.body,document.querySelector('[data-e2e-locator="submission-result"]'),document.querySelector("#qd-content"),document.querySelector('[class*="result"]')].filter(Boolean).forEach(s=>{l.observe(s,{childList:!0,subtree:!0,characterData:!0,attributes:!0})}),console.log(`LeetStreak: Watching for submission result (timeout: ${n/1e3}s)`)}function Y(){return[()=>{const t=document.querySelector('[data-e2e-locator="submission-result"]');return t&&t.textContent.includes("Accepted")?(console.log("Found Accepted in submission-result"),!0):!1},()=>{const t=document.querySelector('.text-green-500, .text-green-600, [class*="text-green"]');return t&&t.textContent.includes("Accepted")?(console.log("Found Accepted in green text"),!0):!1},()=>{const t=document.querySelectorAll('[class*="success"]');for(const n of t)if(n.textContent.includes("Accepted"))return console.log("Found Accepted in success element"),!0;return!1},()=>{const t=document.querySelectorAll("div");for(const n of t)if(n.textContent.trim()==="Accepted"&&n.className.includes("text"))return console.log("Found Accepted div with text class"),!0;return!1}].some(t=>{try{return t()}catch{return!1}})}function O(){return["Wrong Answer","Time Limit Exceeded","Runtime Error","Compile Error"].some(t=>{const n=document.querySelector('[data-e2e-locator="submission-result"]');return n&&n.textContent.includes(t)})}async function W(e,t){try{console.log("LeetStreak: Sending GitHub sync message to background..."),chrome.runtime.sendMessage({type:"GITHUB_SYNC_SUBMISSION",submissionId:e,submission:t},n=>{if(chrome.runtime.lastError){console.error("❌ LeetStreak: Message error:",chrome.runtime.lastError),a("❌ Sync failed: Extension error","error");return}n&&n.success?console.log("✅ LeetStreak: GitHub sync initiated successfully"):(console.error("❌ LeetStreak: GitHub sync failed:",n?.error),a("❌ Sync failed: "+(n?.error||"Unknown error"),"error"))})}catch(n){console.error("❌ LeetStreak: Failed to trigger GitHub sync:",n),a("❌ Sync failed: "+n.message,"error")}}async function V(e){try{const n=(await y([e]))[e];if(n){const o=(await y("failed_syncs")).failed_syncs||[];o.push({submission:n,error:"Timeout: No result detected within 5 minutes",timestamp:Date.now(),retryCount:0}),await k({failed_syncs:o})}await chrome.storage.local.remove(e),console.log("LeetStreak: Marked submission as expired")}catch(t){console.error("LeetStreak: Failed to mark submission as expired:",t)}}async function Q(e){try{await chrome.storage.local.remove(e),console.log("LeetStreak: Discarded pending submission")}catch(t){console.error("LeetStreak: Failed to discard submission:",t)}}function J(){if(!S()){console.log("LeetStreak: Not on a problem page");return}console.log("LeetStreak: Initializing on problem page..."),E(),setTimeout(()=>{d||x()},1500),setTimeout(()=>{d||(console.log("LeetStreak: Retrying button injection..."),x())},4e3);let e=location.href;const t=new MutationObserver(()=>{try{const n=location.href;n!==e&&(e=n,d=!1,g=!1,S()&&(console.log("LeetStreak: URL changed, re-injecting..."),E(),setTimeout(()=>x(),2e3)))}catch(n){n.message&&!n.message.includes("Extension context")&&console.error("LeetStreak: URL observer error:",n)}});try{t.observe(document,{subtree:!0,childList:!0})}catch(n){console.error("LeetStreak: Failed to observe URL changes:",n)}}function K(){if(typeof html2canvas<"u"){console.log("LeetStreak: html2canvas already loaded");return}const e=document.createElement("script");e.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",e.async=!0,e.onload=()=>{console.log("LeetStreak: html2canvas loaded successfully")},e.onerror=()=>{console.warn("LeetStreak: Failed to load html2canvas from CDN");const t=document.createElement("script");t.src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js",t.async=!0,t.onload=()=>console.log("LeetStreak: html2canvas loaded from unpkg"),t.onerror=()=>console.error("LeetStreak: All html2canvas CDN sources failed"),document.head.appendChild(t)},document.head.appendChild(e)}J(),K()})()})();
