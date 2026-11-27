//! Komponen kecil (padanan Progress.tsx versi 1).
use crate::shell::Icon;
use dioxus::prelude::*;

pub fn pct(x: f64) -> String {
    format!("{}%", (x * 100.0).round() as i64)
}

#[derive(Clone, Copy, PartialEq)]
pub enum Tone {
    Lilac,
    Lime,
    Aqua,
    Blush,
}
impl Tone {
    pub fn name(self) -> &'static str {
        match self {
            Tone::Lilac => "lilac",
            Tone::Lime => "lime",
            Tone::Aqua => "aqua",
            Tone::Blush => "blush",
        }
    }
}

#[component]
pub fn Tag(tone: Tone, children: Element) -> Element {
    rsx! { span { class: "tag tag-{tone.name()}", {children} } }
}

#[component]
pub fn StackedBar(total: usize, parts: Vec<(usize, &'static str, &'static str)>) -> Element {
    let desc = parts
        .iter()
        .map(|(n, _, l)| format!("{n} {l}"))
        .collect::<Vec<_>>()
        .join(", ");
    rsx! {
        div { class: "flex w-full overflow-hidden rounded-full border-2 border-slate-900 bg-white h-3.5", role: "img", "aria-label": "{desc}", title: "{desc}",
            if total > 0 {
                for (n, cls, l) in parts.iter().copied() {
                    if n > 0 { span { key: "{l}", class: "ap-grow {cls}", style: "width:{n as f64 / total as f64 * 100.0}%" } }
                }
            }
        }
    }
}

#[component]
pub fn Meter(percent: f64, label: String) -> Element {
    let p = percent.clamp(0.0, 100.0);
    rsx! {
        div { class: "overflow-hidden rounded-full border-2 border-slate-900 bg-white h-3.5", role: "img", "aria-label": "{label}",
            div { class: "ap-grow h-full bg-blue-600", style: "width:{p}%;transition:width var(--ap-dur-slow) var(--ap-ease)" }
        }
    }
}

#[component]
pub fn Ring(value: f64, label: String, #[props(default = 84)] size: u32) -> Element {
    let r = 34.0_f64;
    let c = 2.0 * std::f64::consts::PI * r;
    let v = value.clamp(0.0, 1.0);
    rsx! {
        svg { width: "{size}", height: "{size}", view_box: "0 0 84 84", role: "img", "aria-label": "{label}", class: "shrink-0",
            circle { cx: "42", cy: "42", r: "34", fill: "none", stroke_width: "8", class: "stroke-slate-200" }
            if v > 0.0 {
                circle { cx: "42", cy: "42", r: "34", fill: "none", stroke_width: "8", stroke_linecap: "round",
                    class: "ap-ring stroke-blue-600", stroke_dasharray: "{c} {c}", stroke_dashoffset: "{c * (1.0 - v)}",
                    style: "--ap-from:{c}", transform: "rotate(-90 42 42)" }
            }
        }
    }
}

#[component]
pub fn DoneMark() -> Element {
    rsx! {
        span { class: "inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white", style: "width:22px;height:22px",
            svg { width: "12", height: "12", view_box: "0 0 24 24", fill: "none", stroke: "currentColor", stroke_width: "3", stroke_linecap: "round", stroke_linejoin: "round",
                path { class: "ap-check", d: "M5 13l4 4L19 7" } }
        }
    }
}

#[component]
pub fn Achievement(tone: Tone, title: String, detail: String) -> Element {
    rsx! {
        li { class: "ap-pop flex items-center gap-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-3",
            span { class: "tag-{tone.name()} flex size-9 shrink-0 items-center justify-center rounded-full", Icon { name: "check", size: 18 } }
            span { class: "min-w-0 text-sm",
                b { class: "block font-medium text-slate-900", "{title}" }
                span { class: "text-xs text-slate-500", "{detail}" }
            }
        }
    }
}
