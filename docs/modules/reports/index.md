# Project Reports System - Dreamland Manager

## Overview

Dreamland Manager features an AI-driven **Project Reporting System** that generates professional, executive-level weekly status reports. These reports analyze project progress, tasks, risks, and team sentiment to provide a comprehensive view of project health.

---

## 🛠️ Tech Stack

- **AI Execution**: Custom AI Agent (Groq/Gemini)
- **Formatting**: GitHub Flavored Markdown + [Tailwind Typography](https://tailwindcss.com/docs/typography-plugin)
- **Rendering**: `react-markdown` with `rehype-raw` and `remark-gfm`
- **Output**: Web-native + Print-to-PDF Optimized

---

## 🧠 AI Report Generation

Reports are generated via the `generateProjectReport` server action using the **lightweight `generateText` method** to optimize token usage and stay within API rate limits.

### Executive Prompt Engineering
The system uses a highly structured prompt to enforce professional standards:
- **Executive Summary**: Always starts with a high-level paragraph in a blockquote.
- **Key Metrics Tables**: Uses Markdown tables for scannable data (Date, Progress, Tasks).
- **Sentiment Analysis**: Detailed breakdown of team mood by department in a tabular format.
- **Visual Anchors**: Professional emojis (🚀, 📊, ⚠️, 🧠) serve as visual headers for sections.

---

## 🎨 Aesthetic & UI Refinements

### Executive Density
To ensure reports feel like professional documents rather than blogs, we have implemented **High-Density Typography**:
- **`prose-sm`**: Base font size set to 14px for better detail density.
- **Compact Spacings**: Vertical margins between elements (paragraphs, headers, tables) are minimized.
- **Visual Elevation**: Reports are rendered inside a specialized container with the `ai-glow` utility, `rounded-2xl`, and `shadow-xl`.

### Premium Markdown Extensions
Thanks to `rehype-raw`, the system supports:
- **Underlined Text**: Standard HTML `<u>` tags are rendered correctly.
- **Tables**: Fully styled headers and borders.
- **Advanced Lists**: Nested task lists with status markers.

---

## 📄 Print & PDF Optimization

The system includes a **Print-to-PDF** mode designed for official document sharing.

### Hiding Digital Noise
When printing (Ctrl+P or Button), the following elements are automatically hidden via `@media print`:
- 🚫 Sidebar & Navigation
- 🚫 Action Buttons & Headers
- 🚫 "AI Glow" background effects
- 🚫 Separators and UI utility elements

### Document Layout
- **Fixed Font Size**: Print output is locked to **11pt** (Executive Standard).
- **Break Management**: CSS rules prevent page breaks inside tables or blockquotes for a professional finish.
- **Clean Background**: All colors are normalized for paper (white background, black text).

---

## ⚙️ Configuration

### Tailwind v4 Plugin
The system uses the new Tailwind v4 plugin syntax in `globals.css`:
```css
@plugin "@tailwindcss/typography";
```

### Components
- **Detail Page**: `src/app/[locale]/(dashboard)/reports/[reportId]/page.tsx`
- **Print Button**: `src/components/reports/report-print-button.tsx`
- **Logic**: `src/app/actions/report-actions.ts`
