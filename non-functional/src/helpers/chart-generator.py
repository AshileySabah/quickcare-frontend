import json
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams["font.sans-serif"] = ["Segoe UI", "Arial", "DejaVu Sans"]
plt.rcParams["axes.edgecolor"] = "#CBD5E1"
plt.rcParams["axes.linewidth"] = 0.9

PALETTE = ["#0F766E", "#0284C7", "#D97706", "#DC2626", "#7C3AED", "#16A34A"]


def draw_grouped_bar(spec: dict):
    labels = spec["labels"]
    series = spec["series"]  # [{"name": "...", "values": [...], "color": optional}]
    fig, ax = plt.subplots(figsize=(10.5, 5.4), dpi=220)
    x = np.arange(len(labels))
    width = min(0.75 / max(len(series), 1), 0.28)

    for i, s in enumerate(series):
        offset = (i - (len(series) - 1) / 2) * width
        color = s.get("color") or PALETTE[i % len(PALETTE)]
        bars = ax.bar(x + offset, s["values"], width * 0.92, label=s["name"], color=color, zorder=3)
        for bar in bars:
            h = bar.get_height()
            ax.annotate(
                f"{h:.1f}" if isinstance(h, float) and h % 1 != 0 else f"{int(h)}",
                xy=(bar.get_x() + bar.get_width() / 2, h),
                xytext=(0, 3),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=7.5,
                color="#1E293B",
            )

    if "threshold" in spec and spec["threshold"] is not None:
        th = spec["threshold"]
        ax.axhline(
            th["value"],
            color=th.get("color", "#DC2626"),
            linestyle="--",
            linewidth=1.3,
            label=th.get("label", f"Meta ({th['value']})"),
            zorder=4,
        )

    ax.set_title(spec["title"], fontsize=12.5, fontweight="bold", pad=14, color="#0F172A")
    ax.set_ylabel(spec.get("ylabel", "Valor"), fontsize=10, color="#334155")
    if spec.get("xlabel"):
        ax.set_xlabel(spec["xlabel"], fontsize=10, color="#334155")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=spec.get("xtick_rotation", 12), ha="right" if spec.get("xtick_rotation", 12) else "center", fontsize=8.8)
    ax.grid(axis="y", linestyle=":", alpha=0.65, zorder=0)
    ax.legend(frameon=True, facecolor="#F8FAFC", edgecolor="#E2E8F0", fontsize=8.8)
    fig.tight_layout()
    fig.savefig(spec["output"], dpi=220)
    plt.close(fig)


def draw_dual_axis(spec: dict):
    x_labels = spec["labels"]
    x = np.arange(len(x_labels))
    left = spec["left"]     # {"name": "...", "values": [...], "ylabel": "...", "color": "..."}
    right = spec["right"]   # {"name": "...", "values": [...], "ylabel": "...", "color": "..."}

    fig, ax1 = plt.subplots(figsize=(10.5, 5.4), dpi=220)
    c1 = left.get("color", "#0F766E")
    c2 = right.get("color", "#DC2626")

    bars = ax1.bar(x - 0.16, left["values"], 0.32, label=left["name"], color=c1, alpha=0.88, zorder=3)
    for b in bars:
        h = b.get_height()
        ax1.annotate(f"{h:.1f}", (b.get_x() + b.get_width() / 2, h), xytext=(0, 3), textcoords="offset points", ha="center", fontsize=7.5)

    ax1.set_ylabel(left["ylabel"], color=c1, fontsize=10, fontweight="bold")
    ax1.tick_params(axis="y", labelcolor=c1)
    ax1.set_xticks(x)
    ax1.set_xticklabels(x_labels, fontsize=9)
    ax1.set_xlabel(spec.get("xlabel", ""), fontsize=10, color="#334155")
    ax1.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)

    ax2 = ax1.twinx()
    ax2.plot(x + 0.04, right["values"], color=c2, marker="o", linewidth=2.2, label=right["name"], zorder=5)
    for xi, val in zip(x + 0.04, right["values"]):
        ax2.annotate(f"{val:.1f}", (xi, val), xytext=(0, 6), textcoords="offset points", ha="center", fontsize=8, color=c2, fontweight="bold")
    ax2.set_ylabel(right["ylabel"], color=c2, fontsize=10, fontweight="bold")
    ax2.tick_params(axis="y", labelcolor=c2)

    if "extra_right" in spec:
        er = spec["extra_right"]
        c3 = er.get("color", "#D97706")
        ax2.plot(x + 0.04, er["values"], color=c3, marker="s", linestyle="--", linewidth=1.8, label=er["name"], zorder=4)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left", frameon=True, facecolor="#F8FAFC", fontsize=8.8)

    ax1.set_title(spec["title"], fontsize=12.5, fontweight="bold", pad=14, color="#0F172A")
    fig.tight_layout()
    fig.savefig(spec["output"], dpi=220)
    plt.close(fig)


def draw_timeline(spec: dict):
    x = spec["x"]
    series = spec["series"]
    fig, ax = plt.subplots(figsize=(10.5, 5.0), dpi=220)

    for i, s in enumerate(series):
        color = s.get("color") or PALETTE[i % len(PALETTE)]
        ax.plot(x, s["values"], marker=s.get("marker", "o"), markersize=4.5, linewidth=2.0, color=color, label=s["name"])

    for band in spec.get("bands", []):
        ax.axvspan(band["start"], band["end"], color=band.get("color", "#FEE2E2"), alpha=band.get("alpha", 0.45), label=band.get("label"))

    if "threshold" in spec and spec["threshold"] is not None:
        th = spec["threshold"]
        ax.axhline(th["value"], color=th.get("color", "#DC2626"), linestyle="--", linewidth=1.2, label=th["label"])

    ax.set_title(spec["title"], fontsize=12.5, fontweight="bold", pad=14, color="#0F172A")
    ax.set_xlabel(spec.get("xlabel", "Tempo (s)"), fontsize=10, color="#334155")
    ax.set_ylabel(spec.get("ylabel", "Latência (ms)"), fontsize=10, color="#334155")
    ax.grid(True, linestyle=":", alpha=0.65)
    ax.legend(frameon=True, facecolor="#F8FAFC", edgecolor="#E2E8F0", fontsize=8.8)
    fig.tight_layout()
    fig.savefig(spec["output"], dpi=220)
    plt.close(fig)


def main():
    spec = json.loads(sys.argv[1])
    kind = spec["kind"]
    if kind == "grouped_bar":
        draw_grouped_bar(spec)
    elif kind == "dual_axis":
        draw_dual_axis(spec)
    elif kind == "timeline":
        draw_timeline(spec)
    else:
        raise ValueError(f"Tipo de grafico desconhecido: {kind}")


if __name__ == "__main__":
    main()
