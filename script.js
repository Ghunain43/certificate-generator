/* ================================
   CERTIFICATE GENERATOR - JAVASCRIPT
   Two-page flow:
   - index.html (form) -> certificate.html (preview/download/print)
   ================================ */

// ===== CONFIGURATION =====
const CONFIG = {
    UNIVERSITY_NAME: "Muhammad Ali Jinnah University",
    EVENT_NAME: "From Graduate to Industry-Ready: Mastering AI, Careers & LinkedIn Presence",
    INSTRUCTOR: "Miss Maha Irfan"
};

const STORAGE_KEYS = {
    FORM_DATA: "certificateFormData",
    CERTIFICATE_PAYLOAD: "certificatePayload",
    CERTIFICATE_LAST: "certificateLastGenerated"
};

let certificateFitHandlersAttached = false;

// ===== DOM ELEMENTS (may be null depending on the page) =====
const elements = {
    loadingSpinner: document.getElementById("loadingSpinner"),
    toast: document.getElementById("toast"),

    // Index (form)
    form: document.getElementById("certificateForm"),
    studentName: document.getElementById("studentName"),
    studentId: document.getElementById("studentId"),
    universityName: document.getElementById("universityName"),
    eventName: document.getElementById("eventName"),
    instructor: document.getElementById("instructor"),
    certificateDate: document.getElementById("certificateDate"),

    // Certificate (preview)
    displayStudentName: document.getElementById("displayStudentName"),
    certificateIdRow: document.getElementById("certificateIdRow"),
    displayStudentId: document.getElementById("displayStudentId"),
    displayEventName: document.getElementById("displayEventName"),
    displayUniversityName: document.getElementById("displayUniversityName"),
    displayInstructor: document.getElementById("displayInstructor"),
    displayDate: document.getElementById("displayDate"),

    // Actions (certificate page)
    downloadBtn: document.getElementById("downloadBtn"),
    printBtn: document.getElementById("printBtn"),
    backBtn: document.getElementById("backBtn")
};

function isIndexPage() {
    return Boolean(elements.form && elements.studentName);
}

function isCertificatePage() {
    return Boolean(elements.downloadBtn && document.querySelector(".certificate-container"));
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
    if (isIndexPage()) {
        initIndexPage();
    }

    if (isCertificatePage()) {
        initCertificatePage();
    }

    attachKeyboardShortcuts();
    optimizeForMobile();
    logPerformanceMetrics();
});

// ===== INDEX PAGE =====
function initIndexPage() {
    setPrefilledFields();
    loadFormData();

    elements.studentName.addEventListener(
        "input",
        debounce(() => {
            validateStudentName();
            saveFormData();
        }, 250)
    );

    elements.studentId?.addEventListener(
        "input",
        (e) => {
            if (!elements.studentId) return;
            applyStudentIdMask(elements.studentId, e);
            debouncedSaveFormData();
        }
    );

    elements.studentId?.addEventListener("blur", () => {
        if (!elements.studentId) return;
        elements.studentId.value = normalizeStudentIdForDisplay(elements.studentId.value);
    });

    elements.form.addEventListener("submit", handleFormSubmit);
}

const debouncedSaveFormData = debounce(() => {
    saveFormData();
}, 250);

function setPrefilledFields() {
    if (elements.universityName) elements.universityName.value = CONFIG.UNIVERSITY_NAME;
    if (elements.eventName) elements.eventName.value = CONFIG.EVENT_NAME;
    if (elements.instructor) elements.instructor.value = CONFIG.INSTRUCTOR;
    if (elements.certificateDate) elements.certificateDate.value = getCurrentDate();
}

function validateStudentName() {
    if (!elements.studentName) return;

    const name = elements.studentName.value.trim();

    if (name.length > 100) {
        elements.studentName.value = name.substring(0, 100);
        showToast("Maximum 100 characters allowed", "info");
    }
}

function validateForm() {
    if (!elements.studentName || !elements.studentId) return null;

    const name = elements.studentName.value.trim();
    const rawStudentId = elements.studentId.value.trim();

    if (!name) {
        showToast("Please enter your full name", "error");
        elements.studentName.focus();
        return null;
    }

    if (name.length < 2) {
        showToast("Name must be at least 2 characters", "error");
        elements.studentName.focus();
        return null;
    }

    if (!rawStudentId) {
        showToast("Please enter your student ID", "error");
        elements.studentId.focus();
        return null;
    }

    const normalizedStudentId = normalizeStudentId(rawStudentId);

    if (!normalizedStudentId) {
        showToast("Student ID format should be like SP25-BSCS-0012", "error");
        elements.studentId.focus();
        return null;
    }

    return { studentName: name, studentId: normalizedStudentId };
}

function handleFormSubmit(e) {
    e.preventDefault();

    const validated = validateForm();
    if (!validated) return;

    const payload = {
        studentName: validated.studentName,
        studentId: validated.studentId,
        universityName: CONFIG.UNIVERSITY_NAME,
        eventName: CONFIG.EVENT_NAME,
        instructor: CONFIG.INSTRUCTOR,
        date: getCurrentDate(),
        generatedAt: new Date().toISOString()
    };

    persistCertificatePayload(payload);
    window.location.href = "certificate.html";
}

function saveFormData() {
    if (!elements.studentName) return;

    const data = {
        studentName: elements.studentName.value,
        studentId: elements.studentId?.value || "",
        timestamp: new Date().toISOString()
    };

    try {
        localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(data));
    } catch {
        // ignore
    }
}

function loadFormData() {
    if (!elements.studentName) return;

    try {
        const saved = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
        if (!saved) return;

        const data = JSON.parse(saved);
        const savedDate = new Date(data.timestamp);
        const today = new Date();

        if (savedDate.toDateString() === today.toDateString()) {
            elements.studentName.value = data.studentName || "";
            if (elements.studentId) elements.studentId.value = normalizeStudentIdForDisplay(data.studentId || "");
        } else {
            localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
        }
    } catch {
        // ignore
    }
}

// ===== CERTIFICATE PAGE =====
function initCertificatePage() {
    const payload = loadCertificatePayload();

    if (!payload) {
        showToast("No certificate data found. Redirecting…", "error");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1200);
        return;
    }

    updateCertificateDisplay(payload);

    scheduleCertificateFit();
    attachCertificateFitHandlers();

    document.title = `Certificate - ${payload.studentName} | Muhammad Ali Jinnah University`;

    elements.downloadBtn?.addEventListener("click", downloadCertificatePDF);
    elements.printBtn?.addEventListener("click", printCertificate);
    elements.backBtn?.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    showToast("✓ Certificate ready", "success");
}

function persistCertificatePayload(payload) {
    try {
        sessionStorage.setItem(STORAGE_KEYS.CERTIFICATE_PAYLOAD, JSON.stringify(payload));
    } catch {
        // ignore
    }

    try {
        localStorage.setItem(STORAGE_KEYS.CERTIFICATE_LAST, JSON.stringify(payload));
    } catch {
        // ignore
    }
}

function loadCertificatePayload() {
    const sources = [
        () => sessionStorage.getItem(STORAGE_KEYS.CERTIFICATE_PAYLOAD),
        () => localStorage.getItem(STORAGE_KEYS.CERTIFICATE_LAST)
    ];

    for (const read of sources) {
        try {
            const raw = read();
            if (!raw) continue;

            const payload = JSON.parse(raw);

            if (!payload || typeof payload !== "object") continue;
            if (!payload.studentName) continue;

            const normalizedStudentId = normalizeStudentId(payload.studentId);

            return {
                studentName: String(payload.studentName),
                studentId: normalizedStudentId || "",
                universityName: String(payload.universityName || CONFIG.UNIVERSITY_NAME),
                eventName: String(payload.eventName || CONFIG.EVENT_NAME),
                instructor: String(payload.instructor || CONFIG.INSTRUCTOR),
                date: String(payload.date || getCurrentDate())
            };
        } catch {
            // ignore and try next source
        }
    }

    return null;
}

function updateCertificateDisplay({ studentName, studentId, universityName, eventName, instructor, date }) {
    if (elements.displayStudentName) elements.displayStudentName.textContent = studentName;
    if (elements.displayStudentId) elements.displayStudentId.textContent = studentId;
    if (elements.certificateIdRow) elements.certificateIdRow.style.display = studentId ? "" : "none";
    if (elements.displayEventName) elements.displayEventName.textContent = eventName;
    if (elements.displayUniversityName) elements.displayUniversityName.textContent = universityName;
    if (elements.displayInstructor) elements.displayInstructor.textContent = instructor;
    if (elements.displayDate) elements.displayDate.textContent = date;

    if (elements.displayStudentName) {
        autoFitCertificateName(elements.displayStudentName);
    }

    scheduleCertificateFit();
}

function normalizeStudentId(input) {
    const cleaned = String(input || "")
        .trim()
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 12);

    if (cleaned.length !== 12) return null;

    const upper = cleaned.toUpperCase();
    return `${upper.slice(0, 4)}-${upper.slice(4, 8)}-${upper.slice(8, 12)}`;
}

function normalizeStudentIdForDisplay(input) {
    const cleaned = String(input || "")
        .trim()
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 12);

    if (!cleaned) return "";

    const upper = cleaned.toUpperCase();

    const part1 = upper.slice(0, 4);
    const part2 = upper.slice(4, 8);
    const part3 = upper.slice(8, 12);

    let formatted = part1;
    if (part2) formatted += `-${part2}`;
    if (part3) formatted += `-${part3}`;

    if (cleaned.length === 4 || cleaned.length === 8) {
        formatted += "-";
    }

    return formatted;
}

function applyStudentIdMask(inputEl, event) {
    const rawValue = String(inputEl.value || "");
    const selectionStart = Number.isFinite(inputEl.selectionStart) ? inputEl.selectionStart : rawValue.length;
    const charsBeforeCaret = rawValue.slice(0, selectionStart).replace(/[^a-z0-9]/gi, "").length;

    const inputType = event?.inputType;
    const isInsertion = typeof inputType !== "string" || inputType.startsWith("insert");

    const cleaned = rawValue.replace(/[^a-z0-9]/gi, "").slice(0, 12);
    const upper = cleaned.toUpperCase();

    const part1 = upper.slice(0, 4);
    const part2 = upper.slice(4, 8);
    const part3 = upper.slice(8, 12);

    let formatted = part1;
    if (part2) formatted += `-${part2}`;
    if (part3) formatted += `-${part3}`;

    const caretWasAfterLastChar = charsBeforeCaret >= cleaned.length;
    const shouldAddTrailingDash =
        isInsertion &&
        caretWasAfterLastChar &&
        (upper.length === 4 || upper.length === 8) &&
        !formatted.endsWith("-");

    if (shouldAddTrailingDash) {
        formatted += "-";
    }

    if (formatted === rawValue) return;

    inputEl.value = formatted;

    let newCaret = 0;
    let digitsSeen = 0;

    while (newCaret < formatted.length) {
        if (/[a-z0-9]/i.test(formatted[newCaret])) {
            digitsSeen += 1;
        }

        newCaret += 1;

        if (digitsSeen >= charsBeforeCaret) {
            break;
        }
    }

    if (shouldAddTrailingDash && caretWasAfterLastChar) {
        newCaret = formatted.length;
    }

    try {
        inputEl.setSelectionRange(newCaret, newCaret);
    } catch {
        // ignore
    }
}

function autoFitCertificateName(el) {
    const text = (el.textContent || "").trim();

    // Base name size is 3.4rem in CSS
    let fontSizeRem = 3.4;

    if (text.length > 40) {
        fontSizeRem = 2.2;
    } else if (text.length > 34) {
        fontSizeRem = 2.55;
    } else if (text.length > 28) {
        fontSizeRem = 2.9;
    }

    el.style.fontSize = `${fontSizeRem}rem`;
}

// ===== PDF + PRINT =====
async function downloadCertificatePDF() {
    try {
        if (!window.html2canvas || !window.jspdf?.jsPDF) {
            showToast("PDF libraries not loaded. Please refresh.", "error");
            return;
        }

        const certificateEl = document.querySelector(".certificate-container");
        if (!certificateEl) {
            showToast("Certificate not found.", "error");
            return;
        }

        showLoadingSpinner();

        const canvas = await renderCertificateForPDF(certificateEl);

        const imgData = canvas.toDataURL("image/png");

        // US Letter landscape: 11 × 8.5 inches
        const pdf = new window.jspdf.jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "letter"
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Our certificate is designed to match Letter aspect ratio, so fill the page.
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

        const studentName = elements.displayStudentName?.textContent || "Certificate";
        pdf.save(`Certificate_${sanitizeFileName(studentName)}_${Date.now()}.pdf`);

        showToast("✓ PDF downloaded", "success");
    } catch (err) {
        console.error("PDF Generation Error:", err);
        showToast("Error generating PDF. Please try again.", "error");
    } finally {
        hideLoadingSpinner();
    }
}

function printCertificate() {
    const restore = temporarilyDisableCertificateFit();

    try {
        window.print();
        showToast("✓ Opening print dialog…", "success");
    } catch (err) {
        console.error("Print Error:", err);
        showToast("Error opening print dialog. Please try again.", "error");
    } finally {
        restore();
    }
}

// ===== UI HELPERS =====
function getCurrentDate() {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date().toLocaleDateString("en-US", options);
}

function showLoadingSpinner() {
    elements.loadingSpinner?.classList.add("active");
}

function hideLoadingSpinner() {
    elements.loadingSpinner?.classList.remove("active");
}

function showToast(message, type = "info") {
    if (!elements.toast) return;

    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;

    setTimeout(() => {
        elements.toast?.classList.remove("show");
    }, 3000);
}

function sanitizeFileName(fileName) {
    return String(fileName)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .substring(0, 50);
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

async function waitForImagesToLoad(rootEl) {
    const images = Array.from(rootEl.querySelectorAll("img"));
    const pending = images
        .filter((img) => !img.complete)
        .map(
            (img) =>
                new Promise((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                })
        );

    if (pending.length) {
        await Promise.all(pending);
    }
}

function attachKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        if (!isCertificatePage()) return;

        // Alt+Enter to download
        if (e.altKey && e.key === "Enter") {
            e.preventDefault();
            downloadCertificatePDF();
        }

        // Escape to go back
        if (e.key === "Escape") {
            e.preventDefault();
            window.location.href = "index.html";
        }
    });
}

function optimizeForMobile() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
        document.documentElement.style.setProperty("--spacing-xxl", "2rem");
    }

    scheduleCertificateFit();
}

function attachCertificateFitHandlers() {
    if (certificateFitHandlersAttached) return;
    if (!isCertificatePage()) return;

    certificateFitHandlersAttached = true;

    const onResize = debounce(() => {
        scheduleCertificateFit();
    }, 150);

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", () => {
        // Allow the browser to settle on the new viewport dimensions.
        setTimeout(() => scheduleCertificateFit(), 80);
    });

    if (document.fonts?.ready) {
        document.fonts.ready.then(() => scheduleCertificateFit()).catch(() => {
            // ignore
        });
    }
}

function scheduleCertificateFit() {
    if (!isCertificatePage()) return;

    // Defer to the next paint to ensure layout/fonts are settled.
    window.requestAnimationFrame(() => {
        fitCertificateToViewport();
    });
}

function fitCertificateToViewport() {
    if (!isCertificatePage()) return;

    const previewEl = document.querySelector(".certificate-preview");
    const scaleWrapper = document.querySelector(".certificate-scale");
    const certificateEl = document.querySelector(".certificate-container");

    if (!previewEl || !scaleWrapper || !certificateEl) return;

    // Reset any previous scaling so we can measure the natural size.
    previewEl.classList.remove("is-fit");
    scaleWrapper.classList.remove("is-scaled");
    scaleWrapper.style.width = "";
    scaleWrapper.style.height = "";
    certificateEl.style.transform = "";

    const naturalRect = certificateEl.getBoundingClientRect();
    const naturalWidth = naturalRect.width;
    const naturalHeight = naturalRect.height;

    if (!Number.isFinite(naturalWidth) || naturalWidth <= 0) return;

    const previewStyles = window.getComputedStyle(previewEl);
    const padLeft = Number.parseFloat(previewStyles.paddingLeft) || 0;
    const padRight = Number.parseFloat(previewStyles.paddingRight) || 0;
    const availableWidth = Math.max(0, previewEl.clientWidth - padLeft - padRight);

    if (!Number.isFinite(availableWidth) || availableWidth <= 0) return;

    const scale = Math.min(1, availableWidth / naturalWidth);

    // Only apply when it will actually shrink (avoid sub-pixel jitter).
    if (scale < 0.995 && Number.isFinite(naturalHeight) && naturalHeight > 0) {
        previewEl.classList.add("is-fit");
        scaleWrapper.classList.add("is-scaled");
        scaleWrapper.style.width = `${naturalWidth * scale}px`;
        scaleWrapper.style.height = `${naturalHeight * scale}px`;
        certificateEl.style.transform = `scale(${scale})`;
    }
}

function temporarilyDisableCertificateFit() {
    if (!isCertificatePage()) return () => {};

    const previewEl = document.querySelector(".certificate-preview");
    const scaleWrapper = document.querySelector(".certificate-scale");
    const certificateEl = document.querySelector(".certificate-container");

    if (!previewEl || !scaleWrapper || !certificateEl) return () => {};

    const wasFit = previewEl.classList.contains("is-fit");
    const wasScaled = scaleWrapper.classList.contains("is-scaled");
    const prevWrapperWidth = scaleWrapper.style.width;
    const prevWrapperHeight = scaleWrapper.style.height;
    const prevTransform = certificateEl.style.transform;

    previewEl.classList.remove("is-fit");
    scaleWrapper.classList.remove("is-scaled");
    scaleWrapper.style.width = "";
    scaleWrapper.style.height = "";
    certificateEl.style.transform = "";

    return () => {
        // Restore by recalculating for the current viewport.
        if (wasFit || wasScaled || prevWrapperWidth || prevWrapperHeight || prevTransform) {
            scheduleCertificateFit();
        }
    };
}

async function renderCertificateForPDF(certificateEl) {
    // Render from a clean clone so mobile scaling / overflow containers never crop the output.
    const cloneHost = document.createElement("div");
    cloneHost.setAttribute("aria-hidden", "true");
    cloneHost.style.position = "fixed";
    cloneHost.style.left = "-100000px";
    cloneHost.style.top = "0";
    cloneHost.style.width = "1200px";
    cloneHost.style.padding = "0";
    cloneHost.style.margin = "0";
    cloneHost.style.background = "transparent";
    cloneHost.style.zIndex = "-1";
    cloneHost.style.pointerEvents = "none";

    const clone = certificateEl.cloneNode(true);
    clone.style.transform = "none";
    clone.style.width = "1100px";
    clone.style.maxWidth = "none";
    clone.style.minWidth = "1100px";

    cloneHost.appendChild(clone);
    document.body.appendChild(cloneHost);

    try {
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }
        await waitForImagesToLoad(clone);

        return await window.html2canvas(clone, {
            scale: Math.min(3, (window.devicePixelRatio || 1) * 2),
            useCORS: true,
            allowTaint: false,
            backgroundColor: null,
            logging: false
        });
    } finally {
        cloneHost.remove();
    }
}

function logPerformanceMetrics() {
    if (!window.performance?.timing) return;

    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

    if (Number.isFinite(pageLoadTime) && pageLoadTime > 0) {
        console.log(`Page Load Time: ${pageLoadTime}ms`);
    }
}

console.log("%c🎓 MAJU Certificate Generator Ready!", "font-size: 16px; color: #d4af37; font-weight: bold;");
