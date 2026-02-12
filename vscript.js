
  // ---- CONFIG ----
  const GIRLFRIEND_NAME = "Salimah";
  // ----------------

  const title = document.getElementById("title");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn  = document.getElementById("noBtn");
  const card   = document.getElementById("card");
  const note   = document.getElementById("note");

  title.textContent = `${GIRLFRIEND_NAME}, will you be my valentine?`;
  note.textContent = "“No” seems a bit shy 🙂";

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // Put No inside card for free movement
  card.appendChild(noBtn);
  noBtn.style.position = "absolute";
  noBtn.style.zIndex = "10";

  // Cute rotating messages
  const dodgeLines = [
    "No is feeling shy… 🙂",
    "Oops—too quick!",
    "Try “Yes” 😄",
    "That button is ticklish!",
    "Okay okay… you’re close!",
    "Maybe it’s a sign 💖"
  ];
  let dodgeLineIndex = 0;

  // YES grows on dodges
  let dodgeCount = 0;
  let yesScale = 1;

  function bumpYes() {
    dodgeCount++;
    yesScale = Math.min(1 + dodgeCount * 0.06, 1.65);
    yesBtn.style.transform = `scale(${yesScale})`;

    yesBtn.animate(
      [
        { transform: `scale(${yesScale})` },
        { transform: `scale(${yesScale + 0.06})` },
        { transform: `scale(${yesScale})` }
      ],
      { duration: 220, easing: "ease-out" }
    );

    dodgeLineIndex = (dodgeLineIndex + 1) % dodgeLines.length;
    note.textContent = dodgeLines[dodgeLineIndex];
  }

  function placeNoInitial() {
    const c = card.getBoundingClientRect();
    const b = noBtn.getBoundingClientRect();
    const pad = 16;

    const x = c.width - b.width - 90;
    const y = 150;

    noBtn.style.left = `${clamp(x, pad, c.width - b.width - pad)}px`;
    noBtn.style.top  = `${clamp(y, pad, c.height - b.height - pad)}px`;
  }
  window.addEventListener("load", placeNoInitial);
  window.addEventListener("resize", placeNoInitial);

  const MOVE_DISTANCE  = 55;
  const TRIGGER_RADIUS = 135;
  let lastMoveAt = 0;

  function moveNoSlightly(fromX, fromY) {
    const now = performance.now();
    if (now - lastMoveAt < 120) return;
    lastMoveAt = now;

    const c = card.getBoundingClientRect();
    const b = noBtn.getBoundingClientRect();
    const pad = 16;

    const cx = fromX - c.left;
    const cy = fromY - c.top;

    const curLeft = parseFloat(noBtn.style.left) || (c.width - b.width - 90);
    const curTop  = parseFloat(noBtn.style.top)  || 150;

    const nbCenterX = curLeft + b.width / 2;
    const nbCenterY = curTop  + b.height / 2;

    let dx = (nbCenterX - cx) + (Math.random() - 0.5) * 18;
    let dy = (nbCenterY - cy) + (Math.random() - 0.5) * 14;
    const dist = Math.hypot(dx, dy) || 1;

    let newX = curLeft + (dx / dist) * MOVE_DISTANCE;
    let newY = curTop  + (dy / dist) * MOVE_DISTANCE;

    const maxX = c.width  - b.width  - pad;
    const maxY = c.height - b.height - pad;

    newX = clamp(newX, pad, maxX);
    newY = clamp(newY, pad, maxY);

    noBtn.style.left = `${newX}px`;
    noBtn.style.top  = `${newY}px`;

    bumpYes();
  }

  card.addEventListener("mousemove", (e) => {
    const nb = noBtn.getBoundingClientRect();
    const dist = Math.hypot(
      (nb.left + nb.width / 2) - e.clientX,
      (nb.top  + nb.height / 2) - e.clientY
    );
    if (dist < TRIGGER_RADIUS) moveNoSlightly(e.clientX, e.clientY);
  });

  noBtn.addEventListener("pointerenter", (e) => moveNoSlightly(e.clientX, e.clientY));
  noBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    moveNoSlightly(e.clientX, e.clientY);
  });

  // Mini confetti pop on YES (simple + lightweight)
  const confettiColors = ["#ff2e7a", "#ffffff", "#ffd1e1", "#ff8fb3", "#ff0f66"];
  function confettiPop(originX, originY) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = (originX - 4) + "px";
      c.style.top  = (originY - 6) + "px";
      c.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];

      const cx = (Math.random() * 180 - 90).toFixed(0) + "px";
      const cy = (-1 * (Math.random() * 220 + 90)).toFixed(0) + "px";
      const cr = (Math.random() * 720 - 360).toFixed(0) + "deg";
      c.style.setProperty("--cx", cx);
      c.style.setProperty("--cy", cy);
      c.style.setProperty("--cr", cr);

      const dur = (Math.random() * 300 + 520).toFixed(0);
      c.style.animation = `confettiPop ${dur}ms ease-out forwards`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), +dur);
    }
  }

  function openDateModal() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modalCard" role="dialog" aria-label="Pick a date vibe">
        <h2>Pick our date vibe 💖</h2>
        <div class="pills">
          <button class="pill" data-v="Coffee ☕">Coffee ☕</button>
          <button class="pill" data-v="Ice cream 🍦">Ice cream 🍦</button>
          <button class="pill" data-v="Dinner 🍝">Dinner 🍝</button>
          <button class="pill" data-v="Walk 🌸">Walk 🌸</button>
          <button class="pill" data-v="Movie 🎬">Movie 🎬</button>
        </div>
        <div class="small">Tap one 🙂</div>
      </div>
    `;
    card.appendChild(modal);

    modal.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-v]");
      if (!btn) return;
      const vibe = btn.getAttribute("data-v");
      title.textContent = `It’s a date! ${vibe}`;
      note.textContent = `Can’t wait, ${GIRLFRIEND_NAME} 🙂`;
      modal.remove();
    });
  }

  let accepted = false;
  yesBtn.addEventListener("click", () => {
    if (accepted) return;
    accepted = true;

    const r = yesBtn.getBoundingClientRect();
    confettiPop(r.left + r.width / 2, r.top + r.height / 2);

    card.classList.add("success");
    yesBtn.textContent = "💘";
    noBtn.disabled = true;
    noBtn.style.opacity = "0.25";
    noBtn.style.cursor = "not-allowed";

    openDateModal();
  });

