// JS

(function () {
    const ENTRANCE_SELECTORS = [
        ".logo-banner",
        ".nav-header",
        ".nav-links",
        ".nav + hr",
        ".casestudy-hero-image",
        ".casestudy-overview",
        ".casestudy-overview + hr",
        ".tab-content.is-active .work-content",
        ".tab-content.is-active .work-content > a",
        ".tab-content.is-active .side-quests-content",
        ".tab-content.is-active .side-quests-item",
        ".tab-content.is-active .about-content-upper",
        ".tab-content.is-active .about-content-middle",
        ".tab-content.is-active .work-history",
        ".tab-content.is-active .FAQs",
        ".tab-content.is-active footer",
    ];

    function clearWillChange(e) {
        if (e.animationName !== "elementFadeIn") return;
        e.target.style.willChange = "auto";
    }

    function watchEntranceAnimations(root = document) {
        ENTRANCE_SELECTORS.forEach((selector) => {
            root.querySelectorAll(selector).forEach((el) => {
                el.addEventListener("animationend", clearWillChange, { once: true });
            });
        });
    }

    function startDeferredVideos(root = document) {
        root.querySelectorAll('video[preload="none"]').forEach((video) => {
            if (video.dataset.started) return;
            video.dataset.started = "true";
            video.load();
            video.play().catch(() => {});
        });
    }

    // Elements present at initial load
    watchEntranceAnimations();

    document.querySelectorAll(".tab-content").forEach((section) => {
        new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.attributeName === "class" && section.classList.contains("is-active")) {
                    watchEntranceAnimations(section);
                    startDeferredVideos(section);
                }
            });
        }).observe(section, { attributes: true });
    });

    // In case the default tab is already active on load
    document.querySelectorAll(".tab-content.is-active").forEach((section) => {
        startDeferredVideos(section);
    });
})();

const DEFAULT_TAB = "work";
const TAB_FADE_OUT_MS = 180; // keep in sync with .tab-content.is-leaving duration in style.css

function activateTab(sections, target) {
    sections.forEach((section) => {
        section.classList.toggle("is-active", section === target);
        section.style.display = ""; // clear any leftover inline fallback
    });
}

function showTab(id) {
    const sections = document.querySelectorAll(".tab-content");
    let target = null;
    sections.forEach((section) => {
        if (section.id === id) target = section;
    });

    const resolvedId = target ? id : DEFAULT_TAB;
    const resolvedTarget = target || document.getElementById(DEFAULT_TAB) || sections[0];

    updateActiveLink(resolvedId);

    const current = document.querySelector(".tab-content.is-active");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Nothing to fade out (first load) or already on this tab: switch immediately
    if (!current || current === resolvedTarget || prefersReducedMotion) {
        activateTab(sections, resolvedTarget);
        return;
    }

    // Fade the current tab out, then swap once the animation finishes
    current.classList.remove("is-active");
    current.classList.add("is-leaving");

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        current.classList.remove("is-leaving");
        activateTab(sections, resolvedTarget);
    };

    current.addEventListener("animationend", finish, { once: true });
    // Safety net in case the animationend event doesn't fire (e.g. display toggled elsewhere)
    setTimeout(finish, TAB_FADE_OUT_MS + 50);
}

function updateActiveLink(id) {
    document.querySelectorAll(".nav-links a").forEach((link) => {
        const isActive = link.getAttribute("href") === `#${id}`;
        link.parentElement.classList.toggle("active", isActive);
    });
}

function handleHashChange() {
    const id = window.location.hash.replace("#", "") || DEFAULT_TAB;
    showTab(id);
}

document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const id = link.getAttribute("href").replace("#", "");
        history.pushState(null, "", `#${id}`);
        showTab(id);
    });
});

window.addEventListener("hashchange", handleHashChange);
window.addEventListener("DOMContentLoaded", handleHashChange);


// SIDE QUESTS OVERLAY
const overlay = document.getElementById("sideQuestOverlay");

if (overlay) {
    const overlayMedia = overlay.querySelector(".side-quest-overlay-media");
    const overlayTitle = overlay.querySelector(".side-quest-overlay-title");
    const overlayDescription = overlay.querySelector(".side-quest-overlay-description");
    let lastFocusedElement = null;
    let overlayReturnTab = null;

    function openOverlay(item) {
        const sourceMedia = item.querySelector("img, video");
        if (!sourceMedia) return;

        overlayMedia.innerHTML = "";

        if (sourceMedia.tagName === "VIDEO") {
            const video = document.createElement("video");
            video.src = sourceMedia.currentSrc || sourceMedia.src;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            overlayMedia.appendChild(video);
        } else {
            const img = document.createElement("img");
            img.src = sourceMedia.currentSrc || sourceMedia.src;
            img.alt = sourceMedia.alt || "";
            overlayMedia.appendChild(img);
        }

        overlayTitle.textContent = item.dataset.title || "";
        overlayDescription.textContent = item.dataset.description || "";

        lastFocusedElement = document.activeElement;
        overlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
        overlay.querySelector(".side-quest-overlay-close").focus();

        overlayReturnTab = window.location.hash.replace("#", "") || DEFAULT_TAB;

        history.pushState({ sideQuestOverlay: true }, "", window.location.href);
    }

    function closeOverlay() {
        if (!overlay.classList.contains("is-open")) return;
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        overlayMedia.innerHTML = "";
        if (lastFocusedElement) lastFocusedElement.focus();

        if (overlayReturnTab) {
            showTab(overlayReturnTab);
            if (window.location.hash.replace("#", "") !== overlayReturnTab) {
                history.replaceState(history.state, "", `#${overlayReturnTab}`);
            }
            overlayReturnTab = null;
        }
    }

    function requestCloseOverlay() {
        if (!overlay.classList.contains("is-open")) return;
        history.back();
    }

    document.querySelectorAll(".side-quests-item").forEach((item) => {
        item.addEventListener("click", () => openOverlay(item));
        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openOverlay(item);
            }
        });
    });

    overlay.querySelectorAll("[data-overlay-close]").forEach((el) => {
        el.addEventListener("click", requestCloseOverlay);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) {
            requestCloseOverlay();
        }
    });

    window.addEventListener("popstate", () => {
        if (overlay.classList.contains("is-open")) {
            closeOverlay();
        }
    });
}

// MUSIC PLAYER
(function() {
    const audioPlayer = new Audio();

    const songs = [
        { title: "What's Now Is Now", artist: "CAKE",             color: "#236F9E", accent: "#BF3722", image: "Assets-icons/music-tracks-coverart/showroomofcompassion.jpg", audio: "Assets-icons/music-tracks-coverart/whatsnowisnow.m4a" },
        { title: "Pogo",               artist: "Digitalism",       color: "#160926", accent: "#3FC23A", image: "Assets-icons/music-tracks-coverart/idealism.jpg",              audio: "Assets-icons/music-tracks-coverart/pogo.m4a" },
        { title: "Ever (Foreign Flag)",artist: "Team Sleep",       color: "#755B12", accent: "#CF4108", image: "Assets-icons/music-tracks-coverart/teamsleep.jpg",             audio: "Assets-icons/music-tracks-coverart/ever.m4a" },
        { title: "Collapsing New Buildings", artist: "pennines",   color: "#136085", accent: "#0A212B", image: "Assets-icons/music-tracks-coverart/fairdos.jpg",               audio: "Assets-icons/music-tracks-coverart/collapsingnewbuildings.m4a" },
        { title: "Wither",             artist: "Chatterton",       color: "#4C639C", accent: "#261B15", image: "Assets-icons/music-tracks-coverart/fieldsofthis.jpg",          audio: "Assets-icons/music-tracks-coverart/wither.m4a" },
        { title: "Cath...",            artist: "Death Cab for Cutie", color: "#752310", accent: "#1C3469", image: "Assets-icons/music-tracks-coverart/narrowstairs.jpg",     audio: "Assets-icons/music-tracks-coverart/cath.m4a" },
        { title: "The Flower Called Nowhere", artist: "Stereolab", color: "#28706F", accent: "#A3BA3F", image: "Assets-icons/music-tracks-coverart/dotsandloops.png",         audio: "Assets-icons/music-tracks-coverart/theflowercallednowhere.m4a" },
        { title: "Love Proceeding",    artist: "BADBADNOTGOOD",    color: "#0D3D66", accent: "#1973C2", image: "Assets-icons/music-tracks-coverart/talkmemory.jpg",            audio: "Assets-icons/music-tracks-coverart/loveproceeding.m4a" }
    ];

    let currentSongIndex = Math.floor(Math.random() * songs.length);
    let isPlaying = false;

    function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function loadSong(index, setSrc = true) {
        const song = songs[index];
        if (setSrc) audioPlayer.src = song.audio || '';
        document.getElementById('songTitle').textContent  = song.title;
        document.getElementById('songArtist').textContent = song.artist;
        document.getElementById('totalTime').textContent   = '0:00';
        document.getElementById('currentTime').textContent = '0:00';
        document.getElementById('progressFill').style.width = '0%';

        const player   = document.getElementById('musicPlayer');
        const albumArt = document.getElementById('albumArt');
        player.style.background   = song.color;
        albumArt.style.background = `radial-gradient(circle at 30% 30%, ${song.accent}33, ${song.color})`;
        albumArt.style.borderColor = `${song.accent}44`;
        albumArt.style.backgroundImage    = `url('${song.image}')`;
        albumArt.style.backgroundSize     = 'cover';
        albumArt.style.backgroundPosition = 'center';
        document.getElementById('songTitle').style.color = '#ffffff';
        document.querySelector('.music-btn-play').style.background = song.accent;
        document.querySelector('.music-progress-fill').style.background = song.accent;
    }

    audioPlayer.addEventListener('timeupdate', () => {
        const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
        const timeLeft = audioPlayer.duration - audioPlayer.currentTime;
        if (timeLeft <= 2 && timeLeft > 0 && isPlaying && audioPlayer.volume > 0) {
            audioPlayer.volume = Math.max(timeLeft / 2, 0);
        }
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        document.getElementById('totalTime').textContent = formatTime(audioPlayer.duration);
    });

    audioPlayer.addEventListener('ended', () => {
        audioPlayer.volume = 1;
        nextSong();
    });

    function fadeVolume(from, to, duration, callback) {
        const steps = 20, stepTime = duration / steps, stepSize = (to - from) / steps;
        let current = from;
        audioPlayer.volume = from;
        const fade = setInterval(() => {
            current += stepSize;
            audioPlayer.volume = Math.min(Math.max(current, 0), 1);
            if ((stepSize > 0 && current >= to) || (stepSize < 0 && current <= to)) {
                audioPlayer.volume = to;
                clearInterval(fade);
                if (callback) callback();
            }
        }, stepTime);
    }

    function togglePlay() {
        isPlaying = !isPlaying;
        document.getElementById('playIcon').style.display  = isPlaying ? 'none'  : 'block';
        document.getElementById('pauseIcon').style.display = isPlaying ? 'block' : 'none';
        if (isPlaying) {
            if (!audioPlayer.src) audioPlayer.src = songs[currentSongIndex].audio || '';
            audioPlayer.volume = 0;
            audioPlayer.play();
            fadeVolume(0, 1, 600);
        } else {
            fadeVolume(1, 0, 600, () => audioPlayer.pause());
        }
    }

    function nextSong() {
        fadeVolume(1, 0, 600, () => {
            audioPlayer.pause();
            isPlaying = false;
            document.getElementById('playIcon').style.display  = 'block';
            document.getElementById('pauseIcon').style.display = 'none';
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            loadSong(currentSongIndex);
        });
    }

    function prevSong() {
        fadeVolume(1, 0, 600, () => {
            audioPlayer.pause();
            isPlaying = false;
            document.getElementById('playIcon').style.display  = 'block';
            document.getElementById('pauseIcon').style.display = 'none';
            currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
            loadSong(currentSongIndex);
        });
    }

    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('nextBtn').addEventListener('click', nextSong);
    document.getElementById('prevBtn').addEventListener('click', prevSong);

    loadSong(currentSongIndex, false);
})();

// FAQS ACCORDION
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.FAQ-toggle');
    if (!btn) return;
    const item   = btn.closest('.FAQ-item');
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.FAQ-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.FAQ-toggle').setAttribute('aria-expanded', 'false');
        i.querySelector('.FAQ-body').style.maxHeight = null;
    });

    if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        const body = item.querySelector('.FAQ-body');
        body.style.maxHeight = body.scrollHeight + 'px';
    }
});
