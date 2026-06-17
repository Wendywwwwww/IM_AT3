/*

Project functional design and interaction logic:

This file handles everything that makes the experience interactive. The html defines what
elements exist, the css defines how they look, and this file defines what they DO, like how
the pet moves, what happens when you click buttons, how the countdown works, how the wallet
drains, and so on.

I've also used the comments here to explain bits of code that I learnt while building this
project, the stuff like requestAnimationFrame, the easing algorithm for smooth movement, and
how and when the audio works.

*/


/*
Audio system:
I kept the audio system really simple, just two functions (play and stop). They find the
<audio> element by its ID, reset it to the start (currentTime = 0), and either play or
pause it.
Because some of the browsers block audio that plays before the user interacts with the page.
So even though I don't have any sound effects to be played before the user firstly interacts
with it, but I wrote the .catch(function(){}) at the end of audio.play() to silently handle
the error if the browser refuses to play. Without it, the console might fills up with red
messages that don't actually affect anything.
The angry-mode check inside playSFX lowers the playbackRate to 0.5, which makes all the sounds
sounds deeper and slower. It's a simple way to make everything feel "wrong" without needing
separate audio files.
*/
function playSFX(id) {
    const audio = document.getElementById(id);
    
    /*
    if (audio){} This check prevents the whole function from crashing if someone calls playSFX
    with an ID that doesn't exist. Like if the audio is null or undefined, it will just silently
    do nothin instead of throwing an error.
    */
    if (audio) {
        audio.currentTime = 0;

        /*
        If (condition) {
            // this code runs if the condition is true
        } else {
            // this code runs if the condition is false
        }
        */
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

/*
Some state variables:
These are all the variables that track what's happenin at any given moment. I know putting them
all as global variables at the top might not a good approach but maybe because this is a small size
project so it works fine and makes them easy to access from any function.
targetX / targetY: where the pet is currently moving toward.
petMoving: a flag that prevents multiple animation loops from running at the same time.
currentWindow: tracks which dialogue window is active (1-5).
countdownTimer / walletTimer: hold the setInterval IDs so I can clear them later.
playerChoices: an array that records every choice the user made, so I can determine it when needed.
*/
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

/*
Pet faces:
Each face is build from unicode characters and spacing (&nbsp;). I learnt this spacing way
from building the at3 of studio3 using Twine and utilized here because regular spaces get
collapsed in HTML, and I needed precise control over where the face sits on the cube.
The faces tool a lots of trial and error to get right. Different operating systems render
these characters slightly differently, what looks right on my laptop (windows) but I'm not
sure if it looks a bit of on Mac.
Rather than writing them out as separate variables, I put all facial expressions into a
single object called "faces". So that it's much easier to call. Instead of remembering the
exact html string for each face and type it out every time, I can just write setFace("happy"),
it makes the relationship between game events and expression more obvious.
*/
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
    /*
    Rather than using textContent, I used innerHTML because it has html content in faces.
    Check if the element exists and if the faces object has a key matchin the 'name' parameter.
    */
    if (el && faces[name]) el.innerHTML = faces[name];
}

/*
Dialogue pools:
Each phase of the game has its own set of possible phrases the pet can say. The keys follow
a simple namin system: w1-w5 (waht the pet says when that window is first displayed), y1-y5 (
what it says during the countdown after the user accepts), n2-n5 (what it says during the countdown
after the user rejects), beg (the pleading phrases when the user keeps rejecting window 1).
I made the "yes" dialogue sound excited and grateful, and the "no" dialogue sound disappointed
but not angry (except n5, which is the final rejection). The contrast between the cute dialogue
and what's the virus truly looks like is one of the my favorite parts of the design.
Using 1 object to contains all dialogue's reason is the same as the faces.
*/
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

/*
Store the dialogue array for window 1 into the current pool
*/
let currentPool = talks["w1"];

/*
Click effect:
Every time the user clicks anywhere on the page, this create a ■ character at the click position
that expands and fades out over 0.6 seconds by using setTimeout(function(){}, timeDelayed). Clicking
on empty black space gives user feedback and make it feel responsive.
*/
document.addEventListener("click", function(e) {
    /*
    Create a new <div> element to serve as the visual click effect
    */
    const fx = document.createElement("div");
    /*
    Assign a class name to the new element and set the style of it
    */
    fx.className = "click-effect";
    fx.textContent = "■";
    /*
    Position the effect horizontally at the exact X and Y coordinate where the mouse was clicked.
    */
    fx.style.left = e.clientX + "px";
    fx.style.top = e.clientY + "px";
    /*
    Find the "click-effects" container and insert the new effect div as a child inside it.
    */
    document.getElementById("click-effects").appendChild(fx);
    setTimeout(function() {fx.remove();}, 600);
    playSFX("sfx-click");
});

/*
Speech bubble:
Creates a little dialogue bubble above the pet's head. The bubble appears at the given x,y
coordinates (offset upward by 70px so it floats above the pet), shows a random phrase from
the current dialogue pool, and then disappears automatically after 1.5s (css).
The do...while loop makes sure the same phrase doesn't appear twice in a row, it keeps picking
a random index until it gets one that's different from the last one. If the pool only has 1
phrase (which might not happen but just in case), the loop condition prevents an infinite loop.
I use getElementById to remove any existing bubble before creating a new one, so there's
never more than one bubble on screen at a time.
*/
function showBubble(x, y) {
    const old = document.getElementById("speech-bubble");
    if (old) old.remove();
    /*
    If the current dialogue pool is empty, exit the function.
    */
    if (currentPool.length === 0) return;
    
    /*
    Pick a random line from the currentPool.
    */
    let text;
    do {
        /*
        Select a random index from the array and get its value
        */
        text = currentPool[Math.floor(Math.random() * currentPool.length)];
    /*
    Keep picking a new line if the selected one is the same as the last spoken lines and there
    is more than one line available. Because I think repetition would make users bored to click
    on it the next time.
    */
    } while (text === lastBubbleText && currentPool.length > 1);
    lastBubbleText = text;

    const b = document.createElement("div");
    b.id = "speech-bubble";
    b.className = "speech-bubble";
    b.textContent = text;
    /*
    Centered above the pet / Position it 70px above the given 7 coordinate.
    */
    b.style.left = x + "px";
    b.style.top = (y - 70) + "px";
    document.body.appendChild(b);

}
/*
Find the existing speech bubble element on the page. If it exists, remove it from the DOM.
*/
function hideBubble() {
    const b = document.getElementById("speech-bubble");
    if (b) b.remove();
}

/*
Pet movement:
This was one of the most satisfying and also tough thing to figure out. The pet doesn't just
teleport to wherever the user clicks, it slides there with a easing effect, fast as first and
then slowing down as it gets close.
How it works:
    - Every frame (via requestAnimationFrame), I calculate the distance between the pet's
    current position and the target position using the pythagorean theorem (a*a + b*b = c*c)。
    - The speed for that frame is distance*0.06 so when the pet is far away, it moves fast and
    when it's close, it moves slow.
    - I added a minimal speed of 0.5 so it never gets too slow.
    - When the distance drops below 0.5 pixels, the animation stops to save processing power.
I learnt about requestAnimationFrame after I thought setInterval was the way to do animations.
But requestAnimationFrame syncs with the browser's refresh rate (which i think usually is 60fps),
which makes animations smoother and also pauses automatically when the tab is in the background.
*/
function startMovingPet() {
    const pet = document.getElementById("virus-pet");
    /*
    If the pet is already moving, don't start another movement. Prevent overlapping animations
    that might cause error.
    */
    if (petMoving) return;
    /*
    Set the flag to indicate the pet is now moving
    */
    petMoving = true;

    function move() {
        /*
        Get the pet's current X and Y position from left/top css value, default to 0 if not set.
        */
        const cx = parseFloat(pet.style.left) || 0;
        const cy = parseFloat(pet.style.top) || 0;
        /*
        Calculate the distance from current position to the target position.
        */
        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) {
            petMoving = false;
            return;
        }

        let speed = dist * 0.06;
        if (speed < 0.5) speed = 0.5;
        /*
        dx/dist = normalized direction vector. Multiple by speed to control how far to move this frame.
        */
        pet.style.left = (cx + (dx / dist) * speed) + 'px';
        pet.style.top = (cy + (dy / dist) * speed) + 'px';
        /*
        This keeps calling the move() function until the pet reaches the target
        */
        requestAnimationFrame(move);
    }
    move();
}

/*
Click handlers:
The document-level handler catches clicks on empty space and moves the pet there. It also hides
any existing speech bubble. The checks for el.id and el.closest make sure clicking the pet itself
or buttons doesn't trigger this handler.
The pet-level handler fires when you click the cube directly. It calls stopPropagation() so the
document handler doesn't also fire (which would immediately hide the bubble just created). It then
shows a speech bubble at the pet's current position, so the bubble appears right above the pet's
head.
The angry-mode check at the top of the pet handler is what disables pet interaction during the red
phase, if the body has the angry-mode class, clicking the pet does nothing. This is how I make the
pet feel "uncontrollable" when it's angry
*/
document.addEventListener("click", function(e) {
    const el = e.target;
    /*
    If the clicked element is the pet itself / is inside the pet (child el), do nothing and exit
    early (this click will be handled by the pet's own click listener below).
    */
    if (el.id === "virus-pet" || el.closest("#virus-pet")) return;
    /*
    When the user click on the element that is button, hide any speech bubble and exit. Buttons hv
    their own handlers.
    */
    if (el.tagName === "BUTTON") {hideBubble(); return; }
    hideBubble();
    /*
    Set the target position to where the user clicked, offset by -30px in both X and Y so the pet
    centers on the click point.
    */
    targetX = e.clientX - 30;
    targetY = e.clientY - 30;
    startMovingPet();
});

document.getElementById("virus-pet").addEventListener("click", function(e) {
    if (document.body.classList.contains("angry-mode")) return;
    /*
    Prevent the click from bubbling up to parent elements, this stops the global click handler
    from also firing for this same click.
    */
    e.stopPropagation();
    targetX = e.clientX - 30;
    targetY = e.clientY - 30;
    startMovingPet();
    /*
    Get the bounding rectangle of the pet element (position and dimensions on screen)
    */
    const r = this.getBoundingClientRect();
    /*
    left + half the width; top - 5px
    */
    showBubble(r.left + r.width / 2, r.top - 5);
    playSFX("sfx-bubble");
});

/*
Countdown timer:
This is the big 30s timer that runs after every user choice. It shows a progress bar filling up,
a countdown number ticking down, and a scrolling log that get new entries ar specific time markers.
The actionTexts object at the top sets the initial status message based on which stage the user's
in and whether the user said yes or no. I wanted each stage to feel a bit different like "extracting
files..." for stage 1, and "accessing media..." for stage 2, yalayala.
The yesLogs and noLogs objects are what make the accept and reject paths feel different even though
the timer structure is the same. Accept logs sound productive and technical and reject logs are
intentionally sad and pathetic.
The angry-mode activation happens right at the start of the countdown for stage 5 reject. I add the
css class to the body, which triggers all the red color overrides in the stylesheet, and I also lower
the BGM playbackRate to 0.5 if it's currently playing. (because it's played before w5-n, so the
playbackRate need to be rewrite here instead of just stating at the starts.)
The auto-bubble logic (the timeLeft % 2 === 0 check) makes speech bubbles appear every 2 seconds
during the angry countdown, without the user having to click anything. This creates the feeling that
the pet is ranting.
The extend windows appear 2 seconds into the countdown, but only if the user accepted (isYes === true).
The setTimeout(..., 2000) gives the timer a moment to establish itself before the new window pops in.
*/
function startCountdown (stageNum, isYes) {
    const timerWindow = document.getElementById('timer-window');
    const fill = document.getElementById('timer-fill');
    const action = document.getElementById('timer-action');
    const count = document.getElementById('timer-countdown');
    const log = document.getElementById('timer-log');

    /*
    Reset the log area with a loading message and make the timer window visible cuz I've set them as
    none in html.
    */
    log.innerHTML = "<p>> Loading...</p>";
    timerWindow.style.display = 'block';
    let timeLeft = 30;
    count.textContent = "30s";
    fill.style.width = "0%";

    /*
    Define status messages for each stage based on player's choice.
    */
    const actionTexts = {
        1: "Extracting files...",
        /*
        ?: If isYes is true, show "accessing media...", else(:), show "denying media access..."
        */
        2: isYes ? "Accessing media..." : "Denying media access...",
        3: isYes ? "Activating webcam..." : "Blocking camera...",
        4: isYes ? "Opening wallet..." : "Blocking digital wallet access...",
        5: isYes ? "Finalizing..." : "Being angry, and hungry... Eating files..."
    };
    /*
    Display the appropriate status message (fallback to "processing" if stage is not found).
    */
    action.textContent = actionTexts[stageNum] || "Processing...";

    /*
    !isYes = not isYes = user click reject
    */
    if (stageNum === 5 && !isYes) {
        document.body.classList.add("angry-mode");
        /*
        Slow down the background music to 0.5 speed for creepy effect while angry mode.
        */
        const bgm = document.getElementById("sfx-bgm");
        if (bgm && !bgm.paused) {
            bgm.playbackRate = 0.5;
        }
    }

    /*
    Add an initial log entry showing which phase started. Also, give a hint to player which phase is in.
    */
    const initLog = document.createElement("p");
    initLog.textContent = "> Phase " + stageNum + " started...";
    log.appendChild(initLog);

    /*
    Log messages that appear at specific seconds
    */
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
    /*
    Choose which log set to use based on the choice.
    */
    const logsToUse = isYes ? yesLogs : noLogs;

    countdownTimer = setInterval(function() {
        /*
        Decrease time by 1 second. And update the displayed time seconds and progress bar.
        */
        timeLeft--;
        fill.style.width = ((30 - timeLeft) / 30 * 100) + "%";
        count.textContent = timeLeft + "s";

        /*
        Show a speech bubble above the pet every 2s.
        */
        if (stageNum === 5 && !isYes && timeLeft % 2 === 0 && timeLeft > 0) {
            const pet = document.getElementById("virus-pet");
            const r = pet.getBoundingClientRect();
            showBubble(r.left + r.width / 2, r.top - 5);
        }

        /*
        If the current second has a predefined log message, add it to the log.
        */
        if (logsToUse.hasOwnProperty(timeLeft)) {
            const logEntry = document.createElement("p");
            logEntry.textContent = logsToUse[timeLeft];
            log.appendChild(logEntry);
            /*
            Auto-scroll to show the latest message.
            */
            log.scrollTop = log.scrollHeight;
        }

        /*
        When time reaches 0, the countdown is complete. Stop the timer and update the status text
        to show completion. Wait 1.5s then hide the timer and proceed to the next window.
        */
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            action.textContent = isYes ? "Complete." : "Sad... Complete.";
            setTimeout(function() {
                timerWindow.style.display = "none";
                goToNextWindow();
            }, 1500);
        }
    }, 1000); // 1s interval

    /*
    If the played said yes and we're at stage 2 or later, show additional permission request panels
    after 2 seconds.
    */
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

/*
Wallet drain:
Instead of random purchase, the wallet drains through a fixed sequence of 15 items, each appearing
every 1.8s. Prices escalate from 0.99 to 394.94, totally got only 0.03 remaining.
This precise design ensures some kinda narrative arc, when small innocent purchases gradually become
expensive and you can't do anything with it, creating a sense of loss of control. The total remaining
is 0.03 rather than 0.00, it's that I want to add a touch of dark humour.
Each transaction triggers sfx-wallet for auditory feedback.
*/
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

    /*
    Track which item currently "buying".
    */
    let index = 0;

    walletTimer = setInterval(function() {
        /*
        If all items have been brought, stop the walletTimer.
        */
        if (index >= items.length) {
            clearInterval(walletTimer);
            return;
        }

        /*
        Get the current item and subtract its price from the wallet balance.
        */
        const item = items[index];
        walletMoney -= item.price;
        playSFX("sfx-wallet");
        
        /*
        Update the displayed wallet balance. toFixed(2) - rounded to 2 decimal places.
        */
        document.getElementById("wallet-amount").textContent = walletMoney.toFixed(2);

        /*
        Style it and display it out. Add the transaction to the log.
        */
        const txDiv = document.getElementById("wallet-transactions");
        const tx = document.createElement("p");
        tx.style.color = "#ff4444";
        tx.style.fontSize = "10px";
        tx.textContent = "> " + item.name + "..... -$" + item.price.toFixed(2);
        txDiv.appendChild(tx);
        txDiv.scrollTop = txDiv.scrollHeight;

        /*
        Move to the next item. let index = 0, then index++ = index turns to 1.
        */
        index++;
    }, 1800); // 1.8s interval
}

/*
Choice system:
Records user's choice and hide the current window, then update the pet's facial expression and dialogue
pool, and trigger the countdown.
Stage 1 reject is specially handled with the pleading sequence which would be explained in doPleading.
*/
function handleChoice(stageNum, choice) {
    /*
    Record user's choice in the history array and stores for later reference. push - add a item to array.
    If user click accept in window 1 (stage 1), playerChoices = [ {stage: 1, choice: true}].
    */
    playerChoices.push({ stage: stageNum, choice: choice});

    /*
    !choice = if choice is false.
    If choice is false and user is at the stage 1, trigger the pleading sequence.
    */
    if (!choice && stageNum === 1) {
        playSFX("sfx-reject");
        doPleading(stageNum);
        return;
    }

    /*
    Hide the window and bubble.
    */
    document.getElementById("window-" + stageNum).style.display = "none";
    hideBubble();

    if (choice) {
        /*
        If user chose accept in different stage, set different dialogue pool and change pet's expression.
        */
        playSFX("sfx-accept");
        currentPool = talks["y" + stageNum];
        if (stageNum === 1) setFace("happy");
        else if (stageNum === 2) setFace("love");
        else if (stageNum === 3) setFace("curious");
        else if (stageNum === 4) setFace("evil");
        else setFace("love");
    } else {
        /*
        Same logic with yes path, difference is at stage 5, if user chose reject, it goes to angry mode
        so it needs a more creepy facial expression.
        */
        playSFX("sfx-reject");
        currentPool = talks["n" + stageNum];
        if (stageNum === 5) setFace("angry");
        else setFace("sad");
    }

    /*
    After 1s delay, show a speech bubble automatically to give a hint that the pet is clickable and change
    the dialogue pool in different stage, encourage user click more to interact with the pet.
    The location is the same rational as when I deal with all speech bubble.
    */
    setTimeout(function() {
        const pet = document.getElementById("virus-pet");
        const r = pet.getBoundingClientRect();
        showBubble(r.left + r.width / 2, r.top - 5);
    }, 100);

    /*
    Start the timer for this stage and it will show progress, log, and trigger the next stage when done
    which is explained under startCountdown.
    */
    startCountdown(stageNum, choice);
}

/*
Pleading (user can continue rejecting 3 times at the stage 1):
Three rejections in w1 trigger escalating pleading. The reject button shrinks from 30% to 22% to 14% while
the accept button expands, which makes rejection physically harder and acceptance easier.
The button text will change and the pet's face switches to "pleading", creating a more guilt-inducing
experience designed to make the use reconsider their choice.
After 3 rejections, the deletePet function is called.
*/
function doPleading(stageNum) {
    rejectTimes++;
    document.getElementById("window-1").style.display = "none";

    /*
    If the user has rejected 3 times, the virus gives up and gets deleted.
    */
    if (rejectTimes >= 3) {
        deletePet();
        return;
    }

    /*
    Change current dialogue pool and pet's face.
    */
    currentPool = talks["beg"];
    setFace("begging");

    /*
    Overwrite the dialogue box content.
    [0] = access the first element in the array. I searched that using querySelector would be simpler
    to write but I kinda get used to getElementBy... cuz I think it's more obvious what it means from
    its name, so when using getElementById, it's better to use [0] to indicate it's operating the whole
    array, instead of a single element.
    */
    const w = document.getElementById("window-1");
    w.getElementsByClassName("dialogue-box")[0].innerHTML = 
        /*
        \" is an escape character, which is used to display "" in the text box.
        */
        "<p>\"Wait! Please don't reject me...</p>" +
        "<p>I promise I'll be good! Just give me one more chance...</p>" +
        "<p>I'm begging you... 🥺💔\"</p>";
    
    /*
    Calculate button widths based on how many times the player has rejected, each rejection makes the
    rejection button smaller and makes the acceptance bigger.
    I have a rough time dealing with the percentage, cuz when the reject button shrink, the gap between
    two buttons got bigger so I adjust the value lots of times that finally the gap looks remaining the
    same now.
    */
    const rejectBtn = w.getElementsByClassName("btn-reject")[0];
    const acceptBtn = w.getElementsByClassName("btn-accept")[0];
    const ww = 30 - rejectTimes * 8;
    rejectBtn.style.width = ww + "%";
    /*
    Change the reject button text based on how many times rejected.
    */
    rejectBtn.textContent = ["No...", "Please no..."][rejectTimes - 1] || "No...";
    acceptBtn.style.width = (68 + rejectTimes * 8) + "%";
    acceptBtn.textContent = "Accept";

    /*
    Show the window again with the updated pleading content.
    */
    w.style.display = "flex";

    setTimeout(function() {
        const pet = document.getElementById("virus-pet");
        const r = pet.getBoundingClientRect();
        showBubble(r.left + r.width / 2, r.top - 5);
    }, 100);

    /*
    Override the accept button click handler. Clicking accept removes the last no from history and
    records a yes instead.
    */
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

/*
Trash bin:
The deletion sequence creates a funeral-like scene for the pet. A trash bin emoji appears at the bottom
centre and after 0.5s, a cube begins falling from the top (the animation is handled in css). Then an
alert message confirms deletion, followed by page reload.
*/
function deletePet() {
    /*
    Set certain delay time so the sound effect can just play at the point when the cube been thrown into
    the bin.
    */
    setTimeout(function() { playSFX("sfx-bin"); }, 1100);
    /*
    Hide all elements on the page.
    */
    document.getElementById("virus-pet").style.display = "none";
    document.getElementById("timer-window").style.display = "none";
    document.getElementById("extend-media").style.display = "none";
    document.getElementById("extend-camera").style.display = "none";
    document.getElementById("extend-wallet").style.display = "none";
    /*
    Just for in case, loop through all 5 windows and hide each one. Hide the speech bubble that might
    from the screen.
    */
    for (let i = 1; i <= 5; i++) {
        const w = document.getElementById("window-" + i);
        if (w) w.style.display = "none";
    }
    hideBubble();

    const bin = document.createElement("div");
    bin.className = "trash-bin";
    bin.textContent = "🗑️";
    document.body.appendChild(bin);

    setTimeout(function() {
        /*
        It's like the cube's "ghost"
        */
        const ghost = document.createElement("div");
        ghost.className = "trash-animation";
        ghost.textContent = "■";
        ghost.style.fontSize = "100px";
        ghost.style.zIndex = "10";
        document.body.appendChild(ghost);

        /*
        After 1.6s, clean up the screen and reload.
        */
        setTimeout(function() {
            ghost.remove();
            bin.remove();
            alert("TheCube.exe has been deleted. :(");
            location.reload();
        }, 1600);
    }, 500);
}

/*
When I look back, I just found that the goToNextWindow and startGame have quite similar logic and codes,
like setting the window's display, switching the current dialogue pool, and changing face. This same
sequence of operations was separated into two functions rather than being abstracted into one.
I think that is because at an early stage of this project, I felt this approach is efficient, like it
was quicker to paste the code I have written than to stop and design a proper function signature with
appropriate parameters. However as the codebase grew, the drawbacks became apparent. Any future change
to the window transition would need to be applied in two places, getting a risk of inconsistency. More
importantly, this pattern forces anyone reading the code (mostly me) to mentally feel a bit frustrated
cuz I just write down whatever function comes to mind at the starts, but that actually cause me more time
to adjust it. So this taught me that maybe there's a good way to have a rough structure plan before
start writing the codes, then I think the overall layout will be much cleaner and easy to adjust.
*/
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

/*
Ending:
The ending mimics the windows bsod to immediately create the sense of "system crash".
There are two endings, but both result in file destruction, like they're all no-win scenario that reinforce
the narrative, which is that trusting a virus always leads to negative consequences, so be careful when
dealing with strange file you found on internet, even thought you're some kind of curious about it.
Because I would not ask for the real file access, so the file destruction is purely narrative, this kinda
limits the emotional impact compared to a native application that could demonstrate real system changes.
*/
function showEnding() {
    document.body.classList.remove("angry-mode");
    stopSFX("sfx-bgm");

    document.getElementById("virus-pet").style.display = "none";
    document.getElementById("timer-window").style.display = "none";
    document.getElementById("extend-media").style.display = "none";
    document.getElementById("extend-camera").style.display = "none";
    document.getElementById("extend-wallet").style.display = "none";
    hideBubble();

    /*
    Get the user's last recorded choice, where the playerChoices is an array that stores all choices made
    throughout the game.
    */
    const lastChoice = playerChoices[playerChoices.length - 1];
    const screen = document.getElementById("ending-screen");
    const title = document.getElementById("ending-text");
    const sub = document.getElementById("ending-sub");

    /*
    Two branches with same consequences
    */
    if (lastChoice && lastChoice.choice) {
        title.innerHTML = ":)<br>";
        sub.innerHTML = "Thank you for letting me in!<br>I'm so happy with you and I just love this place so much that...<br>I ate everything... Sorry.. But your files were delicious!🥺";
    } else {
        title.innerHTML= ":(<br>";
        sub.innerHTML = "I'm so sad that you rejected me.<br>After everything.<br>Sadness make me hungry. Sorry about eating all of your files...💔"
    }

    playSFX("sfx-bscreen");
    screen.style.display = "flex";
    /*
    After 10s, reload the page automatically.
    */
    setTimeout(function() { location.reload(); }, 10000);
}

/*
Entry point:
The startGame function is trigger by clicking the desktop icon, mimicking the action of launching an unknown
.exe file. The alert simulates a system dialogue that might appears when running unverified software.
The pet's initial position is calculated as the centre of the viewport, establishing it as the focal point.
The css animationiteration event listener synchronises the jump sound effect with the pet's bouncing animation.
*/
function startGame() {
    alert("Initializing TheCube.exe...");
    document.getElementById("desktop-icon").style.display = "none";
    document.getElementById("window-1").style.display = "flex";
    playSFX("sfx-window");
    /*
    Reset all status.
    */
    currentWindow = 1;
    rejectTimes = 0;
    playerChoices.length = 0;
    currentPool = talks["w1"];
    setFace("normal");

    const pet = document.getElementById("virus-pet");
    pet.style.display = "block";
    /*
    Position the virus at the centre of the screen.
    */
    pet.style.left = (window.innerWidth / 2 - 30) + "px"; //30px is a half of its width / height
    pet.style.top = (window.innerHeight / 2 - 30) + "px";
    /*
    Set the target position (where the pet will move to) to its current position.
    */
    targetX = parseFloat(pet.style.left);
    targetY = parseFloat(pet.style.top);

    /*
    Automatically trigger a speech bubble give a hint to the user that the pet might be interactive, and
    cooperate with the hover effect in css, making user has large possibility to interact with the cube.
    */
    setTimeout(function() {
        const r = pet.getBoundingClientRect();
        showBubble(r.left + r.width / 2, r.top - 5);
    }, 100);

    /*
    animationiteration: Execute the code here at the end of each animation loop.
    */
    pet.addEventListener("animationiteration", function() {
        playSFX("sfx-jump");
    });
}