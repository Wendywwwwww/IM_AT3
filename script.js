function playSFX(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;

        if (document.body.classList.contains("angry-mode")) {
            audio.playbackRate = 0.5;
        } else {
            audio.playbackRate = 1;
        }

        audio.play().catch(function() {});
    }
}

function stopSFX(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

let targetX = 0;
let targetY = 0;
let petMoving = false;
let currentWindow = 1;
let countdownTimer = null;
let walletTimer = null;
let walletMoney = 1247.83;
let rejectTimes = 0;
let lastBubbleText = "";
const playerChoices = [];

const faces = {
    normal: "&nbsp;&nbsp;•́︿•̀<br>/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
    happy: "&nbsp;&nbsp;>w<<br>#&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
    sad: "&nbsp;&nbsp;•́︵`•<br>⊃&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
    angry: "&nbsp;&nbsp;👁&nbsp;👁<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
    curious: "&nbsp;&nbsp;•ω•<br>///&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
    love: "&nbsp;&nbsp;>&nbsp;<<br>♡&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
    evil: "&nbsp;&nbsp;>ᴗ<<br>ψ&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
    begging: "&nbsp;&nbsp;•́﹏•̀<br>⊃&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;⊂"
}

function setFace(name) {
    const el = document.getElementById("pet-face");
    if (el && faces[name]) el.innerHTML = faces[name];
}

const talks = {
    "w1": ["Can I...", "I'm cold...", "Plzzzz let me in...", "I'm a good cube!", "So warm inside..."],
    "w2": ["So quiet...", "I just want some music...", "Can I play something?", "Your playlist please...", "Music time?"],
    "w3": ["What do you look like?", "Are you tall?", "I'm curious...", "Let me see you!", "I wanna see you..."],
    "w4": ["I found a cute skin!", "It's only $1...", "So sparkly!", "Can I buy it?", "Shopping time!"],
    "w5": ["This is it...", "Final question...", "I really like it here...", "Can I stay?", "Forever?"],
    "y1": ["Yay! Thank you!", "So warm...", "I'm home!", "Best day ever!", "You're the best!"],
    "y2": ["This song is soooo nice!", "Do you like it?", "Turn it up!", "Best playlist!", "I love music!"],
    "y3": ["You look great!", "Smile!", "I can see you!", "So handsome!", "This is so cool!"],
    "y4": ["So pretty!", "Just one more...", "Shopping is fun!", "Omg that looks good too...", "Oops, bought more..."],
    "y5": ["Forever home!", "I love you!", "Best human ever!", "Hmmm I started feeling a bit hungry...", "We're family now!"],
    "n2": ["Why no music?", "So quiet...", "I just wanted to share...", "Silence is sad...", "Maybe next time?"],
    "n3": ["Are you shy?", "I bet you're nice...", "I'll imagine then...", "I know... Privacy, right?", "Maybe someday?"],
    "n4": ["But it's only $1...", "I never get nice things...", "Sad...", "Window shopping then...", "I'm not cool now..."],
    "n5": ["After everything?", "You're kicking me out?", "I thought we were friends...", "So cold...", "You'll regret this!"],
    "beg": ["Please don't reject me!", "I'm begging you!", "One more chance!", "Don't send me away!", "I'm too cute to delete!"]
};

let currentPool = talks["w1"];

document.addEventListener("click", function(e) {
    const fx = document.createElement("div");
    fx.className = "click-effect";
    fx.textContent = "■";
    fx.style.left = e.clientX + "px";
    fx.style.top = e.clientY + "px";
    document.getElementById("click-effects").appendChild(fx);
    setTimeout(function() {fx.remove();}, 600);
    playSFX("sfx-click");
});

function showBubble(x, y) {
    const old = document.getElementById("speech-bubble");
    if (old) old.remove();
    if (currentPool.length === 0) return;

    let text;
    do {
        text = currentPool[Math.floor(Math.random() * currentPool.length)];
    } while (text === lastBubbleText && currentPool.length > 1);
    lastBubbleText = text;

    const b = document.createElement("div");
    b.id = "speech-bubble";
    b.className = "speech-bubble";
    b.textContent = text;
    b.style.left = x + "px";
    b.style.top = (y - 70) + "px";
    document.body.appendChild(b);

}

function hideBubble() {
    const b = document.getElementById("speech-bubble");
    if (b) b.remove();
}


function startMovingPet() {
    const pet = document.getElementById("virus-pet");
    if (petMoving) return;
    petMoving = true;

    function move() {
        const cx = parseFloat(pet.style.left) || 0;
        const cy = parseFloat(pet.style.top) || 0;
        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) {
            petMoving = false;
            return;
        }

        let speed = dist * 0.06;
        if (speed < 0.5) speed = 0.5;
        pet.style.left = (cx + (dx / dist) * speed) + 'px';
        pet.style.top = (cy + (dy / dist) * speed) + 'px';
        requestAnimationFrame(move);
    }
    move();
}

document.addEventListener("click", function(e) {
    const el = e.target;
    if (el.id === "virus-pet" || el.closest("#virus-pet")) return;
    if (el.tagName === "BUTTON") {hideBubble(); return; }
    hideBubble();
    targetX = e.clientX - 30;
    targetY = e.clientY - 30;
    startMovingPet();
});

document.getElementById("virus-pet").addEventListener("click", function(e) {
    if (document.body.classList.contains("angry-mode")) return;
    e.stopPropagation();
    targetX = e.clientX - 30;
    targetY = e.clientY - 30;
    startMovingPet();
    const r = this.getBoundingClientRect();
    showBubble(r.left + r.width / 2, r.top - 5);
    playSFX("sfx-bubble");
});

function startCountdown (stageNum, isYes) {
    const timerWindow = document.getElementById('timer-window');
    const fill = document.getElementById('timer-fill');
    const action = document.getElementById('timer-action');
    const count = document.getElementById('timer-countdown');
    const log = document.getElementById('timer-log');

    log.innerHTML = "<p>> Loading...</p>";
    timerWindow.style.display = 'block';
    let timeLeft = 30;
    count.textContent = "30s";
    fill.style.width = "0%";

    const actionTexts = {
        1: "Extracting files...",
        2: isYes ? "Accessing media..." : "Denying media access...",
        3: isYes ? "Activating webcam..." : "Blocking camera...",
        4: isYes ? "Opening wallet..." : "Blocking digital wallet access...",
        5: isYes ? "Finalizing..." : "Being angry, and hungry... Eating files..."
    };
    action.textContent = actionTexts[stageNum] || "Processing...";

    if (stageNum === 5 && !isYes) {
        document.body.classList.add("angry-mode");
        const bgm = document.getElementById("sfx-bgm");
        if (bgm && !bgm.paused) {
            bgm.playbackRate = 0.5;
        }
    }

    const initLog = document.createElement("p");
    initLog.textContent = "> Phase " + stageNum + " started...";
    log.appendChild(initLog);

    const yesLogs = {
        24: "> Processing...",
        18: "> Working...",
        12: "> Almost there...",
        6: "> Finalizing...",
        0: "> Complete.",
    };
    const noLogs = {
        24: "> Sad...",
        18: "> Sad..",
        12: "> Sad.",
        6: "> Keep being sad :(((",
        0: "> Done being sad."
    };
    const logsToUse = isYes ? yesLogs : noLogs;

    countdownTimer = setInterval(function() {
        timeLeft--;
        fill.style.width = ((30 - timeLeft) / 30 * 100) + "%";
        count.textContent = timeLeft + "s";

        if (stageNum === 5 && !isYes && timeLeft % 2 === 0 && timeLeft > 0) {
            const pet = document.getElementById("virus-pet");
            const r = pet.getBoundingClientRect();
            showBubble(r.left + r.width / 2, r.top - 5);
        }

        if (logsToUse.hasOwnProperty(timeLeft)) {
            const logEntry = document.createElement("p");
            logEntry.textContent = logsToUse[timeLeft];
            log.appendChild(logEntry);
            log.scrollTop = log.scrollHeight;
        }

        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            action.textContent = isYes ? "Complete." : "Sad... Complete.";
            setTimeout(function() {
                timerWindow.style.display = "none";
                goToNextWindow();
            }, 1500);
        }
    }, 1000);

    if (isYes && stageNum >= 2) {
        setTimeout(function() {
            if (stageNum === 2) {
                document.getElementById("extend-media").style.display = "block";
                playSFX("sfx-bgm");
            }
            if (stageNum === 3) document.getElementById("extend-camera").style.display = "block";
            if (stageNum === 4) {
                document.getElementById("extend-wallet").style.display = "block";
                startWalletDrain();
            }
        }, 2000);
    }
}

function startWalletDrain() {
    walletMoney = 1247.83;
    const items = [
        { name: "A cool skin", price: 0.99 },
        { name: "A pretty hat", price: 1.99 },
        { name: "A pair of sunglasses", price: 2.99 },
        { name: "A pair of fancy shoes", price: 4.99 },
        { name: "A shiny cape", price: 6.99 },
        { name: "A glowing effect", price: 9.99 },
        { name: "A cube toy", price: 14.99 },
        { name: "A disco outfit", price: 19.99 },
        { name: "A sparkle trail", price: 29.99 },
        { name: "Another cool skin", price: 49.99 },
        { name: "An expensive toy", price: 79.99 },
        { name: "A keyboard", price: 129.99 },
        { name: "A tiny robot toy", price: 199.99 },
        { name: "A golden crown", price: 299.99 },
        { name: "Everything bundle", price: 394.94 },
    ];

    let index = 0;

    walletTimer = setInterval(function() {
        if (index >= items.length) {
            clearInterval(walletTimer);
            return;
        }

        const item = items[index];
        walletMoney -= item.price;
        playSFX("sfx-wallet");
        
        document.getElementById("wallet-amount").textContent = walletMoney.toFixed(2);

        const txDiv = document.getElementById("wallet-transactions");
        const tx = document.createElement("p");
        tx.style.color = "#ff4444";
        tx.style.fontSize = "10px";
        tx.textContent = "> " + item.name + "..... -$" + item.price.toFixed(2);
        txDiv.appendChild(tx);
        txDiv.scrollTop = txDiv.scrollHeight;

        index++;
    }, 1800);
}

function handleChoice(stageNum, choice) {
    playerChoices.push({ stage: stageNum, choice: choice});

    if (!choice && stageNum === 1) {
        playSFX("sfx-reject");
        doPleading(stageNum);
        return;
    }

    document.getElementById("window-" + stageNum).style.display = "none";
    hideBubble();

    if (choice) {
        playSFX("sfx-accept");
        currentPool = talks["y" + stageNum];
        if (stageNum === 1) setFace("happy");
        else if (stageNum === 2) setFace("love");
        else if (stageNum === 3) setFace("curious");
        else if (stageNum === 4) setFace("evil");
        else setFace("love");
    } else {
        playSFX("sfx-reject");
        currentPool = talks["n" + stageNum];
        if (stageNum === 5) setFace("angry");
        else setFace("sad");
    }

    setTimeout(function() {
        const pet = document.getElementById("virus-pet");
        const r = pet.getBoundingClientRect();
        showBubble(r.left + r.width / 2, r.top - 5);
    }, 100);

    startCountdown(stageNum, choice);
}

function doPleading(stageNum) {
    rejectTimes++;
    document.getElementById("window-1").style.display = "none";

    if (rejectTimes >= 3) {
        deletePet();
        return;
    }

    currentPool = talks["beg"];
    setFace("begging");

    const w = document.getElementById("window-1");
    w.getElementsByClassName("dialogue-box")[0].innerHTML = 
        "<p>\"Wait! Please don't reject me...</p>" +
        "<p>I promise I'll be good! Just give me one more chance...</p>" +
        "<p>I'm begging you... 🥺💔\"</p>";
    
    const rejectBtn = w.getElementsByClassName("btn-reject")[0];
    const acceptBtn = w.getElementsByClassName("btn-accept")[0];
    const ww = 30 - rejectTimes * 8;
    rejectBtn.style.width = ww + "%";
    rejectBtn.textContent = ["No...", "Please no..."][rejectTimes - 1] || "No...";
    acceptBtn.style.width = (68 + rejectTimes * 8) + "%";
    acceptBtn.textContent = "Accept";

    w.style.display = "flex";

    setTimeout(function() {
        const pet = document.getElementById("virus-pet");
        const r = pet.getBoundingClientRect();
        showBubble(r.left + r.width / 2, r.top - 5);
    }, 100);

    rejectBtn.onclick = function() {
        playSFX("sfx-reject");
        doPleading(stageNum);
    };
    acceptBtn.onclick = function() {
        playerChoices.pop();
        playerChoices.push({ stage: 1, choice: true });
        handleChoice(1, true);
    };
}

function deletePet() {
    setTimeout(function() { playSFX("sfx-bin"); }, 1100);
    document.getElementById("virus-pet").style.display = "none";
    document.getElementById("timer-window").style.display = "none";
    document.getElementById("extend-media").style.display = "none";
    document.getElementById("extend-camera").style.display = "none";
    document.getElementById("extend-wallet").style.display = "none";

    for (let i = 1; i <= 5; i++) {
        const w = document.getElementById("window-" + i);
        if (w) w.style.display = "none";
    }
    if (walletTimer) clearInterval(walletTimer);
    hideBubble();

    const bin = document.createElement("div");
    bin.className = "trash-bin";
    bin.textContent = "🗑️";
    document.body.appendChild(bin);

    setTimeout(function() {
        const ghost = document.createElement("div");
        ghost.className = "trash-animation";
        ghost.textContent = "■";
        ghost.style.fontSize = "100px";
        ghost.style.zIndex = "10";

        document.body.appendChild(ghost);
        setTimeout(function() {
            ghost.remove();
            bin.remove();
            alert("TheCube.exe has been deleted. :(");
            location.reload();
        }, 1600);
    }, 500);
}

function goToNextWindow() {
    currentWindow++;
    if (currentWindow <=5) {
        document.getElementById("window-" + currentWindow).style.display = "flex";
        currentPool = talks["w" + currentWindow];
        setFace("normal");
        playSFX("sfx-window");

        setTimeout(function() {
            const pet = document.getElementById("virus-pet");
            const r = pet.getBoundingClientRect();
            showBubble(r.left + r.width / 2, r.top - 5);
        }, 100);

    } else {
        showEnding();
    }
}

function showEnding() {
    document.body.classList.remove("angry-mode");
    stopSFX("sfx-bgm");

    document.getElementById("virus-pet").style.display = "none";
    document.getElementById("timer-window").style.display = "none";
    document.getElementById("extend-media").style.display = "none";
    document.getElementById("extend-camera").style.display = "none";
    document.getElementById("extend-wallet").style.display = "none";
    if (walletTimer) clearInterval(walletTimer);
    hideBubble();

    const lastChoice = playerChoices[playerChoices.length - 1];
    const screen = document.getElementById("ending-screen");
    const title = document.getElementById("ending-text");
    const sub = document.getElementById("ending-sub");

    if (lastChoice && lastChoice.choice) {
        title.innerHTML = ":)<br>";
        sub.innerHTML = "Thank you for letting me in!<br>I'm so happy with you and I just love this place so much that...<br>I ate everything... Sorry.. But your files were delicious!🥺";
    } else {
        title.innerHTML= ":(<br>";
        sub.innerHTML = "I'm so sad that you rejected me.<br>After everything.<br>Sadness make me hungry. Sorry about eating all of your files...💔"
    }

    playSFX("sfx-bscreen");
    screen.style.display = "flex";
    setTimeout(function() { location.reload(); }, 10000);
}

function startGame() {
    alert("Initializing TheCube.exe...");
    document.getElementById("desktop-icon").style.display = "none";
    document.getElementById("window-1").style.display = "flex";
    playSFX("sfx-window");
    currentWindow = 1;
    rejectTimes = 0;
    playerChoices.length = 0;
    currentPool = talks["w1"];
    setFace("normal");

    const pet = document.getElementById("virus-pet");
    pet.style.display = "block";
    pet.style.left = (window.innerWidth / 2 - 30) + "px";
    pet.style.top = (window.innerHeight / 2 - 30) + "px";
    targetX = parseFloat(pet.style.left);
    targetY = parseFloat(pet.style.top);

    setTimeout(function() {
        const r = pet.getBoundingClientRect();
        showBubble(r.left + r.width / 2, r.top - 5);
    }, 100);

    pet.addEventListener("animationiteration", function() {
        playSFX("sfx-jump");
    });
}