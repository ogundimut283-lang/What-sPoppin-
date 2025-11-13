let CURRENT_HTML = "", CURRENT_DESC = "", CURRENT_LANG = "en";
let ACTIVE_BOARD_ID = null;
let waitingForInviteInput = false;



async function callOpenAI(prompt, model = "gpt-4.1-mini") {
  const res = await fetch("https://what-spoppin.onrender.com/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model })
  });

  const data = await res.json();
  return data.output;
}

window.hf = {
  writer: async (prompt) => await callOpenAI(prompt, "gpt-4.1"),
  summarizer: async (prompt) => await callOpenAI(prompt, "gpt-4.1-mini")
};

// === Feature detection ===

const $ = s => document.querySelector(s);
const output = $("#output"), savedList = $("#savedList"), eventInput = $("#eventDesc");

// function escapeHtml(s){return (s||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
// function htmlToPlain(html){return html.replace(/<br\/?>/g,"\n").replace(/<\/?ul>/g,"\n").replace(/<li>/g,"- ").replace(/<\/li>/g,"\n").replace(/<[^>]+>/g,"").trim();}
// function boardHTML(t){return t.replace(/^(\s*[-•]\s+)/gm,"<li>").replace(/^#{0,3}\s?(.+)$/gm,"<h3>$1</h3>").replace(/(\n<li>.*)+/g,m=>`<ul>${m}</ul>`).replace(/\n/g,"<br>");}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

// Convert HTML content to plain text
function htmlToPlain(html) {
  return html
    .replace(/<br\/?>/g, "\n")
    .replace(/<\/?ul>/g, "\n")
    .replace(/<li>/g, "- ")
    .replace(/<\/li>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Convert simple markdown-like text into light HTML (no bold)
function boardHTML(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/^(\s*[-•]\s+)/gm, "<li>")
    .replace(/(\n<li>.*)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n/g, "<br>");
}


function appendBubble(html, cls="poppy"){
  const div=document.createElement("div");
  div.className=`bubble ${cls}`;
  div.innerHTML=html;
  output.appendChild(div);
  output.scrollTop=output.scrollHeight;
}

function autoSaveCurrent() {
  if (!CURRENT_DESC && !CURRENT_HTML) return;

  const bubbles = Array.from(document.querySelectorAll("#output .bubble"));
  const htmlContent = bubbles.map(b => b.outerHTML).join("");

  const raw = localStorage.getItem("pb.boards");
  const boards = raw ? JSON.parse(raw) : [];


  if (!ACTIVE_BOARD_ID) {
    ACTIVE_BOARD_ID = crypto.randomUUID();
  }

  const index = boards.findIndex(b => b.id === ACTIVE_BOARD_ID);

  const boardData = {
    id: ACTIVE_BOARD_ID,
    title: toTitleCase((CURRENT_DESC || "Party Board").slice(0, 60)),
    html: htmlContent,
    desc: CURRENT_DESC,
    ts: Date.now(),
  };

  if (index !== -1) {
    boards[index] = boardData; 
  } else {
    boards.push(boardData); 
  }

  localStorage.setItem("pb.boards", JSON.stringify(boards));
}




async function generateBoard(e) {
  //if (e && typeof e.preventDefault === "function") e.preventDefault();
  e?.preventDefault();

  const eventDesc = eventInput.value.trim();
  if (!eventDesc) {
    appendBubble("<p>Tell me what we’re planning! 💡</p>");
    return;
  }
  eventInput.value = "";
  CURRENT_DESC = eventDesc;


  appendBubble(`<p>Planning <b>${escapeHtml(eventDesc)}</b>… ✨</p>`);
  const removeThinking = await showThinking(1000);

  try {
    const prompt = POPPY.makeBoardPrompt({ eventDesc});
    const resText = await hf.writer(prompt);

    await removeThinking();

    const html = `<div class="board">${boardHTML(resText)}</div>`;
    CURRENT_HTML = html;
    CURRENT_LANG = "en";
    appendBubble(html);
    // Ensure a board exists before saving anything
    if (!ACTIVE_BOARD_ID) {
      ACTIVE_BOARD_ID = crypto.randomUUID();
      const title = toTitleCase((CURRENT_DESC || "Party Board").slice(0, 60));
      const newBoard = {
        id: ACTIVE_BOARD_ID,
        title,
        html,
        desc: CURRENT_DESC,
        ts: Date.now(),
      };

      const raw = localStorage.getItem("pb.boards");
      const boards = raw ? JSON.parse(raw) : [];
      boards.push(newBoard);
      localStorage.setItem("pb.boards", JSON.stringify(boards));
    }

    autoSaveCurrent();;

    loadSaved();
  } catch (e) {
    await removeThinking();
    appendBubble(`<p>Error: ${escapeHtml(e.message)}</p>`);
    autoSaveCurrent();
  }
}



async function moreGamesIdeas(){
  if(!CURRENT_HTML){appendBubble("<p>Generate a board first 🎲</p>");return;}
  const removeThinking = await showThinking(1000);
  try{
    const resText = await hf.writer(`Suggest 3–5 new unique party games/activities that match this event:\n${CURRENT_DESC}\n\nExisting board:\n${htmlToPlain(CURRENT_HTML)}`
    );
    await removeThinking();
    appendBubble(`<div class="board"><h3>🎯 More Games & Activities</h3>${boardHTML(resText)}</div>`);
    autoSaveCurrent();
    loadSaved();

  }catch(e){
    await removeThinking();
    appendBubble(`<p>Game ideas failed: ${escapeHtml(e.message)}</p>`);
    autoSaveCurrent();
    loadSaved();
  }
}

async function moreFoodIdeas(){
  if(!CURRENT_HTML){appendBubble("<p>Generate a board first 🍴</p>");return;}
  const removeThinking = await showThinking(1000);
  try{
    const resText = await hf.writer(`Suggest 3–5 new creative food or drink ideas that match this event:\n${CURRENT_DESC}\n\nExisting menu:\n${htmlToPlain(CURRENT_HTML)}`);
    await removeThinking();
    appendBubble(`<div class="board"><h3>🍽️ More Menu Ideas</h3>${boardHTML(resText)}</div>`);
    autoSaveCurrent();
    loadSaved();

  }catch(e){
    await removeThinking();
    appendBubble(`<p>Food ideas failed: ${escapeHtml(e.message)}</p>`);
    autoSaveCurrent();
    loadSaved();

  }
}


async function summarizeBoard() {
  if (!CURRENT_HTML) {
    appendBubble("<p>Generate a board first 📋</p>");
    return;
  }
  
  // Ask user for details first
  appendBubble(`
    <p>Okay! 🎀 Let’s make your party invitation!<br>
    Please list what you’d like to include using this format:<br><br>
    <b>event name:</b> ...<br>
    <b>decor:</b> ...<br>
    <b>menu:</b> ...<br>
    <b>games:</b> ...<br><br>
    (Example: <i>event name: Cozy Christmas Dinner, decor: fairy lights and pinecones, menu: ham and cocoa bar, games: white elephant and karaoke</i>)</p>
  `, "poppy");

  waitingForInviteInput = true;}

//   try {
//     const summaryPrompt = POPPY.summarizePrompt(CURRENT_HTML, CURRENT_DESC);
//     const resText = await hf.summarizer(summaryPrompt);
//     await removeThinking();

//     appendBubble(`
//       <p><b>Invitation Summary 📢</b><br>${escapeHtml(resText).replace(/\n/g, "<br>")}</p>
//       `, "poppy");

//     await removeThinking();

//     autoSaveCurrent();
//     loadSaved();

//   } catch (e) {
//     await removeThinking();
//     appendBubble(`<p>Summary glitch: ${escapeHtml(e.message)}</p>`, "poppy");
//     autoSaveCurrent();
//     loadSaved();

//   }
// }
$("#generate").addEventListener("click", async (e) => {
  e.preventDefault();
  const userInput = eventInput.value.trim();
  if (!userInput) return;

  appendBubble(`<div class="bubble user">${escapeHtml(userInput)}</div>`);

  if (waitingForInviteInput) {
    waitingForInviteInput = false;
    eventInput.value = "";

    const removeThinking = await showThinking(1000);
    try {
      const summaryPrompt = `
You are Poppy, an enthusiastic and creative party planner.
Using the user's chosen highlights below, write a fun, emoji-filled party invitation.
Make it 2–3 paragraphs long, referencing event name, decor, menu, and games.

User’s choices:
${userInput}
      `;
      const resText = await hf.writer(summaryPrompt);
      await removeThinking();

      appendBubble(`<p><b>Invitation Summary 📢</b><br>${escapeHtml(resText).replace(/\n/g, "<br>")}</p>`, "poppy");
      autoSaveCurrent();
    } catch (err) {
      await removeThinking();
      appendBubble(`<p>Oops! Something went wrong while creating your invite. 😅</p>`, "poppy");
    }
    return;
  }

  await generateBoard(e);
});


// === POPPY IS THINKING HANDLER ===
async function showThinking(minTime = 3000) {
  const div = document.createElement("div");
  div.className = "bubble poppy thinking";
  div.innerHTML = `
    <span>One sec — Poppy’s on it…</span>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  `;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;

  const start = Date.now();

  // Return a function to fade out & remove bubble after minTime
  return async function removeThinking() {
    const elapsed = Date.now() - start;
    if (elapsed < minTime) await new Promise(r => setTimeout(r, minTime - elapsed));

    // Apply fade-out class
    div.classList.add("fade-out");

    // Wait for animation to finish, then remove
    await new Promise(r => setTimeout(r, 400));
    div.remove();
  };
}






function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function loadSaved() {
  const raw = localStorage.getItem("pb.boards");
  const boards = raw ? JSON.parse(raw) : [];
  savedList.innerHTML = "";

  boards
    .sort((a, b) => b.ts - a.ts)
    .forEach(b => {
      const div = document.createElement("div");
      div.className = "saved-item";
      div.innerHTML = `<b>${escapeHtml(b.title)}</b><br/><small>${new Date(b.ts).toLocaleString()}</small>`;

      div.onclick = () => {
        if (ACTIVE_BOARD_ID && ACTIVE_BOARD_ID !== b.id) {
          try {
            autoSaveCurrent();
          } catch (err) {
            console.warn("Auto-save failed before switching:", err);
          }
        }

        ACTIVE_BOARD_ID = b.id;
        CURRENT_DESC = b.desc || "";
        CURRENT_HTML = b.html;
        output.innerHTML = b.html; // restore exact previous chat

        setTimeout(() => { output.scrollTop = output.scrollHeight; }, 100);

      };

      savedList.appendChild(div);
    });
}


function startNewChat() {
  output.innerHTML = "";
  appendBubble(`
    <p>Hey hey! I’m <b>Poppy</b>, your enthusiastic and chaotic party planner 🎀<br>
    Tell me about your event and I’ll whip up a dazzling Party Board — themes, décor, menu, and games galore!</p>
  `, "poppy");

  CURRENT_DESC = "";
  CURRENT_HTML = "";
  ACTIVE_BOARD_ID = null;
  loadSaved();
}




function clearAll(){localStorage.removeItem("pb.boards");startNewChat();loadSaved();}

// === Theme Toggle ===
function loadTheme(){
  const saved=localStorage.getItem("pb.theme")||"dark";
  document.documentElement.setAttribute("data-theme",saved);
  $("#themeToggle").textContent=saved==="dark"?"☀️ Light Mode":"🌙 Dark Mode";
}
function toggleTheme(){
  const current=document.documentElement.getAttribute("data-theme")||"dark";
  const next=current==="dark"?"light":"dark";
  document.documentElement.setAttribute("data-theme",next);
  localStorage.setItem("pb.theme",next);
  $("#themeToggle").textContent=next==="dark"?"☀️ Light Mode":"🌙 Dark Mode";
}

window.addEventListener("beforeunload", () => {
  clearTimeout(saveTimer);
  autoSaveCurrent();
});


// === Event Listeners ===
//$("#generate").addEventListener("click",generateBoard);
$("#moreGames").addEventListener("click",moreGamesIdeas);
$("#moreFood").addEventListener("click",moreFoodIdeas);
$("#summarizeBoard").addEventListener("click",summarizeBoard);
$("#clearAll").addEventListener("click",clearAll);
$("#themeToggle").addEventListener("click",toggleTheme);

$("#newChat").addEventListener("click", startNewChat);


loadSaved(); 
loadTheme();



