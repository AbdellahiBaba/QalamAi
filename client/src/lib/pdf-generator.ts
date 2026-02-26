import { jsPDF } from "jspdf";

interface Chapter {
  chapterNumber: number;
  title: string;
  content: string | null;
}

interface NovelData {
  title: string;
  chapters: Chapter[];
}

function reverseArabicLine(text: string): string {
  return text.split("").reverse().join("");
}

function splitTextIntoLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateNovelPDF(novel: NovelData): Promise<void> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN_TOP = 70;
  const MARGIN_BOTTOM = 70;
  const MARGIN_RIGHT = 60;
  const MARGIN_LEFT = 60;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_RIGHT - MARGIN_LEFT;
  const LINE_HEIGHT = 28;
  const TITLE_LINE_HEIGHT = 40;
  const CHARS_PER_LINE = 55;

  canvas.width = PAGE_WIDTH * 2;
  canvas.height = PAGE_HEIGHT * 2;
  ctx.scale(2, 2);

  const pages: ImageData[] = [];

  function savePage() {
    pages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function clearPage() {
    ctx.fillStyle = "#FFFDF5";
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    ctx.strokeStyle = "#D4A574";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60);
  }

  function drawPageNumber(pageNum: number) {
    ctx.font = "12px 'Cairo', sans-serif";
    ctx.fillStyle = "#8B7355";
    ctx.textAlign = "center";
    ctx.fillText(String(pageNum), PAGE_WIDTH / 2, PAGE_HEIGHT - 40);
  }

  function drawRTLText(text: string, x: number, y: number, font: string, color: string = "#2C1810") {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    ctx.fillText(text, x, y);
  }

  clearPage();

  const titleY = PAGE_HEIGHT / 2 - 60;
  drawRTLText(novel.title, PAGE_WIDTH - MARGIN_RIGHT, titleY - 40, "bold 36px 'Amiri', serif", "#8B4513");

  ctx.strokeStyle = "#D4A574";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_LEFT + 100, titleY);
  ctx.lineTo(PAGE_WIDTH - MARGIN_RIGHT - 100, titleY);
  ctx.stroke();

  drawRTLText("QalamAI — منصّة الكتابة الروائية العربية", PAGE_WIDTH - MARGIN_RIGHT, titleY + 40, "18px 'Cairo', sans-serif", "#8B7355");

  savePage();

  let pageNum = 2;

  for (const chapter of novel.chapters) {
    if (!chapter.content) continue;

    clearPage();
    let y = MARGIN_TOP + 20;

    drawRTLText(`الفصل ${chapter.chapterNumber}`, PAGE_WIDTH - MARGIN_RIGHT, y, "bold 14px 'Cairo', sans-serif", "#8B7355");
    y += TITLE_LINE_HEIGHT;

    drawRTLText(chapter.title, PAGE_WIDTH - MARGIN_RIGHT, y, "bold 24px 'Amiri', serif", "#8B4513");
    y += 15;

    ctx.strokeStyle = "#D4A574";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAGE_WIDTH - MARGIN_RIGHT, y);
    ctx.lineTo(PAGE_WIDTH - MARGIN_RIGHT - 150, y);
    ctx.stroke();
    y += TITLE_LINE_HEIGHT;

    const paragraphs = chapter.content.split("\n").filter(p => p.trim());

    for (const paragraph of paragraphs) {
      const lines = splitTextIntoLines(paragraph.trim(), CHARS_PER_LINE);

      for (const line of lines) {
        if (y > PAGE_HEIGHT - MARGIN_BOTTOM) {
          drawPageNumber(pageNum);
          savePage();
          pageNum++;
          clearPage();
          y = MARGIN_TOP;
        }

        drawRTLText(line, PAGE_WIDTH - MARGIN_RIGHT, y, "16px 'Amiri', serif");
        y += LINE_HEIGHT;
      }

      y += 10;
    }

    drawPageNumber(pageNum);
    savePage();
    pageNum++;
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [PAGE_WIDTH, PAGE_HEIGHT],
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();

    ctx.putImageData(pages[i], 0, 0);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }

  pdf.save(`${novel.title}.pdf`);
}

export async function generateChapterPreviewPDF(chapter: Chapter): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN_TOP = 70;
  const MARGIN_BOTTOM = 70;
  const MARGIN_RIGHT = 60;
  const LINE_HEIGHT = 28;
  const TITLE_LINE_HEIGHT = 40;
  const CHARS_PER_LINE = 55;

  canvas.width = PAGE_WIDTH * 2;
  canvas.height = PAGE_HEIGHT * 2;
  ctx.scale(2, 2);

  const pages: ImageData[] = [];

  function savePage() {
    pages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function clearPage() {
    ctx.fillStyle = "#FFFDF5";
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    ctx.strokeStyle = "#D4A574";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60);
  }

  function drawPageNumber(pageNum: number) {
    ctx.font = "12px 'Cairo', sans-serif";
    ctx.fillStyle = "#8B7355";
    ctx.textAlign = "center";
    ctx.fillText(String(pageNum), PAGE_WIDTH / 2, PAGE_HEIGHT - 40);
  }

  function drawRTLText(text: string, x: number, y: number, font: string, color: string = "#2C1810") {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    ctx.fillText(text, x, y);
  }

  clearPage();
  let y = MARGIN_TOP + 20;

  drawRTLText(`الفصل ${chapter.chapterNumber}`, PAGE_WIDTH - MARGIN_RIGHT, y, "bold 14px 'Cairo', sans-serif", "#8B7355");
  y += TITLE_LINE_HEIGHT;
  drawRTLText(chapter.title, PAGE_WIDTH - MARGIN_RIGHT, y, "bold 24px 'Amiri', serif", "#8B4513");
  y += 15;
  ctx.strokeStyle = "#D4A574";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(PAGE_WIDTH - MARGIN_RIGHT, y);
  ctx.lineTo(PAGE_WIDTH - MARGIN_RIGHT - 150, y);
  ctx.stroke();
  y += TITLE_LINE_HEIGHT;

  let pageNum = 1;
  const content = chapter.content || "";
  const paragraphs = content.split("\n").filter((p: string) => p.trim());

  for (const paragraph of paragraphs) {
    const lines = splitTextIntoLines(paragraph.trim(), CHARS_PER_LINE);
    for (const line of lines) {
      if (y > PAGE_HEIGHT - MARGIN_BOTTOM) {
        drawPageNumber(pageNum);
        savePage();
        pageNum++;
        clearPage();
        y = MARGIN_TOP;
      }
      drawRTLText(line, PAGE_WIDTH - MARGIN_RIGHT, y, "16px 'Amiri', serif");
      y += LINE_HEIGHT;
    }
    y += 10;
  }

  drawPageNumber(pageNum);
  savePage();

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [PAGE_WIDTH, PAGE_HEIGHT],
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    ctx.putImageData(pages[i], 0, 0);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }

  const blob = pdf.output("blob");
  return URL.createObjectURL(blob);
}
