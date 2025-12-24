(function(){"use strict";(function(){console.log("LeetStreak: Content script loaded");let l=!1,d=null;function p(){return window.location.pathname.startsWith("/problems/")&&window.location.pathname!=="/problems/"}function f(){try{const e=document.querySelector('[data-cy="question-title"]')||document.querySelector('div[class*="text-title"]'),t=e?e.textContent.trim():"Unknown Problem",r=window.location.pathname.split("/problems/")[1]?.split("/")[0]||"",n=document.querySelector("div[diff]")||document.querySelector('[class*="text-difficulty"]'),o=n?n.textContent.trim():"Medium",s=document.querySelector('[data-track-load="description_content"]')||document.querySelector('[class*="elfjS"]'),a=s?s.textContent.trim().substring(0,500):"",c=t.match(/^(\d+)\./),B=c?c[1]:"";return{title:t,slug:r,difficulty:o,description:a,number:B,url:window.location.href}}catch(e){return console.error("Error extracting problem data:",e),null}}function y(){try{const e=document.querySelectorAll(".view-lines");if(e.length>0)return Array.from(e[0].querySelectorAll(".view-line")).map(n=>n.textContent).join(`
`);const t=document.querySelector('textarea[class*="code"]');return t?t.value:""}catch(e){return console.error("Error extracting code:",e),""}}function b(){try{const e=document.querySelector('button[id*="lang"]')||document.querySelector('[class*="lang-select"]');return e?e.textContent.trim():"Python"}catch{return"Python"}}function u(e,t,r,n=!1){const o=document.createElement("button");return o.className=n?"leetstreak-floating-btn":"leetstreak-btn",o.innerHTML=`
      <span class="icon">${t}</span>
      <span class="text">${e}</span>
    `,n?o.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `:o.style.cssText=`
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        margin-left: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `,o.addEventListener("mouseenter",()=>{o.style.transform="translateY(-2px)",o.style.boxShadow=n?"0 6px 25px rgba(102, 126, 234, 0.5)":"0 4px 12px rgba(102, 126, 234, 0.4)"}),o.addEventListener("mouseleave",()=>{o.style.transform="translateY(0)",o.style.boxShadow=n?"0 4px 20px rgba(102, 126, 234, 0.4)":"0 2px 8px rgba(102, 126, 234, 0.3)"}),o.addEventListener("click",r),o}function h(){if(document.getElementById("leetstreak-floating-menu"))return;const t=document.createElement("div");t.id="leetstreak-floating-menu",t.style.cssText=`
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 10000;
    `;const r=u("Queue","📋",g,!0),n=u("Screenshot","📸",x,!0);r.style.bottom="80px",n.style.bottom="20px",t.appendChild(r),t.appendChild(n),document.body.appendChild(t),console.log("LeetStreak: Floating buttons added as fallback")}async function g(){if(d=f(),!d){i("❌ Could not extract problem data","error");return}try{const t=(await chrome.storage.local.get("problem_queue")).problem_queue||[];if(t.some(n=>n.slug===d.slug)){i("📋 Already in queue!","info");return}t.push({...d,addedAt:Date.now(),status:"pending"}),await chrome.storage.local.set({problem_queue:t}),i("✅ Added to queue!","success")}catch(e){console.error("Error adding to queue:",e),i("❌ Failed to add to queue","error")}}async function x(){d=f();const e=y(),t=b();if(!e){i("❌ No code found. Write some code first!","error");return}i("📸 Generating screenshot...","info"),v(d,e,t)}function v(e,t,r){const n=document.getElementById("leetstreak-screenshot-modal");n&&n.remove();const o=document.createElement("div");o.id="leetstreak-screenshot-modal",o.style.cssText=`
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
    `,s.innerHTML=k(e,t,r),o.appendChild(s),document.body.appendChild(o),o.addEventListener("click",a=>{a.target===o&&o.remove()}),setTimeout(()=>{document.getElementById("leetstreak-close-modal")?.addEventListener("click",()=>{o.remove()}),document.getElementById("leetstreak-copy-screenshot")?.addEventListener("click",()=>{S()}),document.getElementById("leetstreak-download-screenshot")?.addEventListener("click",()=>{C(e.title)})},100)}function k(e,t,r){const n={primary:"#667eea",secondary:"#764ba2",easy:"#00b8a3",medium:"#ffc01e",hard:"#ef4743"},o=n[e.difficulty.toLowerCase()]||n.medium;return`
      <div style="padding: 24px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 24px; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;">
            Code Screenshot Preview
          </h2>
          <button id="leetstreak-close-modal" style="
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #666;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
          ">×</button>
        </div>
        
        <!-- Screenshot Content -->
        <div id="leetstreak-screenshot-content" style="
          background: linear-gradient(135deg, ${n.primary} 0%, ${n.secondary} 100%);
          border-radius: 12px;
          padding: 32px;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
        ">
          <!-- Problem Header -->
          <div style="margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <span style="
                background: ${o};
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
              ">${e.difficulty}</span>
              ${e.number?`<span style="opacity: 0.8; font-size: 14px;">#${e.number}</span>`:""}
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">
              ${e.title}
            </h1>
          </div>
          
          <!-- Code Block -->
          <div style="
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 20px;
            backdrop-filter: blur(10px);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 13px; opacity: 0.8; font-weight: 600;">${r}</span>
              <span style="font-size: 12px; opacity: 0.6;">${new Date().toLocaleDateString()}</span>
            </div>
            <pre style="
              margin: 0;
              font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
              font-size: 14px;
              line-height: 1.6;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
            ">${w(t)}</pre>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; opacity: 0.8; font-size: 13px;">
            <span>🔥 LeetStreak</span>
            <span>leetcode.com</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
          <button id="leetstreak-copy-screenshot" style="
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">📋 Copy as Image</button>
          <button id="leetstreak-download-screenshot" style="
            padding: 10px 20px;
            background: #764ba2;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">💾 Download PNG</button>
        </div>
        
        <p style="margin-top: 12px; font-size: 12px; color: #666; text-align: center;">
          💡 Tip: Right-click on the preview above to save it manually
        </p>
      </div>
    `}function w(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}async function S(){try{const e=document.getElementById("leetstreak-screenshot-content");if(!e)return;typeof html2canvas<"u"?(await html2canvas(e,{backgroundColor:null,scale:2})).toBlob(async r=>{try{await navigator.clipboard.write([new ClipboardItem({"image/png":r})]),i("✅ Copied to clipboard!","success")}catch{i("❌ Copy failed. Try download instead.","error")}}):i("📥 Use Download button instead","info")}catch(e){console.error("Copy error:",e),i("❌ Copy failed","error")}}async function C(e){try{const t=document.getElementById("leetstreak-screenshot-content");if(!t)return;if(typeof html2canvas<"u"){const r=await html2canvas(t,{backgroundColor:null,scale:2}),n=document.createElement("a");n.download=`${e.replace(/[^a-z0-9]/gi,"_")}_${Date.now()}.png`,n.href=r.toDataURL(),n.click(),i("✅ Downloaded!","success")}else i("💡 Right-click on preview to save","info")}catch(t){console.error("Download error:",t),i("❌ Download failed","error")}}function i(e,t="info"){const r=document.getElementById("leetstreak-notification");r&&r.remove();const n={success:"#10b981",error:"#ef4444",info:"#667eea"},o=document.createElement("div");o.id="leetstreak-notification",o.textContent=e,o.style.cssText=`
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${n[t]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideInRight 0.3s ease;
    `,document.body.appendChild(o),setTimeout(()=>{o.style.animation="slideOutRight 0.3s ease",setTimeout(()=>o.remove(),300)},3e3)}function m(){if(l)return;if(console.log("LeetStreak: Attempting to inject buttons..."),document.getElementById("leetstreak-buttons")){console.log("LeetStreak: Buttons already exist"),l=!0;return}let e=null;const t=document.querySelector('[data-e2e-locator*="console"]');if(t&&(e=t.parentElement?.parentElement,console.log("LeetStreak: Found via testid")),!e){const a=Array.from(document.querySelectorAll("button")).find(c=>c.textContent.includes("Submit")||c.textContent.includes("Run")||c.textContent.includes("Test"));a&&(e=a.parentElement,console.log("LeetStreak: Found via submit button"))}if(!e){const s=document.querySelectorAll('div[class*="flex"]');for(const a of s)if(a.querySelectorAll("button").length>=2&&a.offsetHeight>30){e=a,console.log("LeetStreak: Found via flex container");break}}if(!e){const s=document.querySelectorAll('[class*="header"], [class*="toolbar"]');s.length>0&&(e=s[0],console.log("LeetStreak: Found via header"))}if(!e){console.log("LeetStreak: Could not find injection point. Will retry...");return}console.log("LeetStreak: Found injection point:",e);const r=document.createElement("div");r.id="leetstreak-buttons",r.style.cssText=`
      display: inline-flex;
      gap: 8px;
      align-items: center;
      margin-left: 12px;
      z-index: 100;
    `;const n=u("Add to Queue","📋",g),o=u("Code Screenshot","📸",x);r.appendChild(n),r.appendChild(o),e.appendChild(r),l=!0,console.log("LeetStreak: Buttons injected successfully!")}function L(){if(!p()){console.log("LeetStreak: Not on a problem page");return}console.log("LeetStreak: On problem page, initializing..."),setTimeout(()=>{l||(console.log("LeetStreak: Adding floating buttons as fallback"),h())},3e3),[1e3,2e3,3e3,5e3].forEach(n=>{setTimeout(()=>{l||(console.log(`LeetStreak: Trying injection after ${n}ms...`),m())},n)}),new MutationObserver(n=>{p()&&!l&&document.querySelectorAll("button").length>5&&(console.log("LeetStreak: DOM changed, trying injection..."),m())}).observe(document.body,{childList:!0,subtree:!0});let r=location.href;new MutationObserver(()=>{const n=location.href;n!==r&&(r=n,l=!1,p()&&(console.log("LeetStreak: URL changed, re-injecting..."),setTimeout(()=>m(),2e3)))}).observe(document,{subtree:!0,childList:!0})}function E(){const e=document.createElement("script");e.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",e.onload=()=>{console.log("LeetStreak: html2canvas loaded")},document.head.appendChild(e)}L(),E()})()})();
