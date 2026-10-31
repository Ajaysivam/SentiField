import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, ArrowStyle, PathPatch
import matplotlib.patheffects as patheffects

def create_ieee_architecture_diagram(output_path):
    # Standard IEEE two-column / wide figure dimensions
    fig, ax = plt.subplots(figsize=(16, 9.5), dpi=300)
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#ffffff')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Color Palette - Professional IEEE / Nature Scientific Style
    c_bg_layer = '#f8fafc'
    c_border_layer = '#cbd5e1'
    
    # Layer colors
    layers_cfg = [
        {"name": "Layer 1: Multi-Source Data Ingestion", "col": "#1e3a8a", "box_bg": "#eff6ff", "box_border": "#93c5fd", "badge": "DATA INGESTION"},
        {"name": "Layer 2: Multispectral Processing & Feature Engineering", "col": "#065f46", "box_bg": "#ecfdf5", "box_border": "#6ee7b7", "badge": "PREPROCESSING"},
        {"name": "Layer 3: Multi-Model ML Crop Stress Classification", "col": "#7c2d12", "box_bg": "#fff7ed", "box_border": "#fdba74", "badge": "MACHINE LEARNING"},
        {"name": "Layer 4: Explainable AI (SHAP Interpretability)", "col": "#581c87", "box_bg": "#faf5ff", "box_border": "#d8b4fe", "badge": "EXPLAINABILITY"},
        {"name": "Layer 5: Generative Agronomic Optimization (Gemini AI)", "col": "#0f766e", "box_bg": "#f0fdfa", "box_border": "#5eead4", "badge": "LLM OPTIMIZATION"},
        {"name": "Layer 6: Decision Support & Farmer Action Output", "col": "#1e293b", "box_bg": "#f8fafc", "box_border": "#cbd5e1", "badge": "DEPLOYMENT"}
    ]

    # Title Banner
    ax.text(50, 97.5, "PROPOSED END-TO-END ARCHITECTURE & DATA FLOW PIPELINE", 
            fontsize=15, fontweight='bold', ha='center', va='center', color='#0f172a', family='DejaVu Sans')
    ax.text(50, 95.2, "Multispectral Remote Sensing (Sentinel-2) • Multi-Model Machine Learning (XGBoost/RF/MLP) • SHAP XAI • Gemini AI Agronomic Optimization",
            fontsize=9.5, style='italic', ha='center', va='center', color='#475569', family='DejaVu Sans')

    # Draw Layer 1 to Layer 6 Vertical/Horizontal Layout
    # We will arrange them into 3 main columns or a streamlined 6-stage flow
    # Let's create 6 distinct horizontal/block cards:
    # 2 rows x 3 columns for incredible clarity and readability!
    
    col_w = 28.5
    row_h = 36.5
    
    coords = [
        # (x, y, w, h)
        (3.5, 54, col_w, row_h),   # Layer 1: Data Ingestion (Top Left)
        (35.5, 54, col_w, row_h),  # Layer 2: Feature Engineering (Top Mid)
        (68.0, 54, col_w, row_h),  # Layer 3: ML Classification (Top Right)
        (68.0, 10, col_w, row_h),  # Layer 4: SHAP Explainability (Bottom Right)
        (35.5, 10, col_w, row_h),  # Layer 5: Gemini AI Optimization (Bottom Mid)
        (3.5, 10, col_w, row_h)    # Layer 6: Decision Support & Output (Bottom Left)
    ]

    for idx, (x, y, w, h) in enumerate(coords):
        cfg = layers_cfg[idx]
        # Main Card background
        rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3,rounding_size=1.2",
                              facecolor=cfg["box_bg"], edgecolor=cfg["box_border"], linewidth=1.5, zorder=2)
        ax.add_patch(rect)
        
        # Header Badge
        header_rect = FancyBboxPatch((x + 0.8, y + h - 4.2), w - 1.6, 3.4, boxstyle="round,pad=0.2,rounding_size=0.6",
                                     facecolor=cfg["col"], edgecolor='none', zorder=3)
        ax.add_patch(header_rect)
        ax.text(x + w/2, y + h - 2.5, cfg["name"], fontsize=9.2, fontweight='bold', color='#ffffff', ha='center', va='center', zorder=4)

    # ----------------------------------------------------
    # CONTENT INSIDE LAYER 1: DATA INGESTION
    # ----------------------------------------------------
    l1_x, l1_y = coords[0][0], coords[0][1]
    
    # Sub-blocks inside Layer 1
    sub_blocks_l1 = [
        ("Copernicus Sentinel-2 L2A", "10m/20m BOA Surface Reflectance\nBands: B2, B3, B4, B8, B8A, B11", "#dbeafe", "#1d4ed8"),
        ("Multi-Pass Temporal Engine", "30-Day Multi-Revisit S2 Extraction\nDeduplicated Trajectory Dynamics", "#e0e7ff", "#4338ca"),
        ("Live Ag-Weather API (Open-Meteo)", "Solar Rad, Temp, Relative Humidity,\n7-Day Rain, ET0 Evapotranspiration", "#ecfeff", "#0e7490"),
        ("Cadastral Parcel GIS Input", "GeoJSON Boundary, Parcel Area (Acres),\nZonal Centroid & Spatial Polygons", "#f1f5f9", "#334155")
    ]
    for i, (stitle, sdesc, sbg, stxt) in enumerate(sub_blocks_l1):
        sy = l1_y + 24 - (i * 7.4)
        sb = FancyBboxPatch((l1_x + 1.2, sy), col_w - 2.4, 6.2, boxstyle="round,pad=0.15,rounding_size=0.5",
                            facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
        ax.add_patch(sb)
        ax.text(l1_x + 2.2, sy + 4.3, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
        ax.text(l1_x + 2.2, sy + 2.0, sdesc, fontsize=7.0, color='#334155', linespacing=1.2, zorder=4)

    # ----------------------------------------------------
    # CONTENT INSIDE LAYER 2: FEATURE ENGINEERING
    # ----------------------------------------------------
    l2_x, l2_y = coords[1][0], coords[1][1]
    sub_blocks_l2 = [
        ("Cloud & Quality Masking", "SCL / QA60 Filtering & Cloud Shadow removal\nPixel-level radiometric correction", "#d1fae5", "#047857"),
        ("5 Multispectral Indices", "• NDVI = (NIR - RED) / (NIR + RED)\n• NDRE = (NIR - RE) / (NIR + RE)\n• EVI = 2.5*(NIR-RED)/(NIR+6*RED-7.5*BL+1)\n• SAVI = 1.5*(NIR - RED)/(NIR + RED + 0.5)\n• NDBI = (SWIR - NIR)/(SWIR + NIR)", "#dcfce7", "#15803d"),
        ("Spatiotemporal Feature Matrix", "Vector: [NDVI, NDRE, EVI, SAVI, NDBI,\nArea, Temp, Humidity, Rain, ET0]", "#f0fdf4", "#166534"),
        ("Data Scaling & Stratification", "StandardScaler Normalization & 80:20\nStratified Train-Test Parcel Partition", "#ecfdf5", "#065f46")
    ]
    for i, (stitle, sdesc, sbg, stxt) in enumerate(sub_blocks_l2):
        if i == 1:
            # Taller block for formulas
            sy = l2_y + 13.8
            sh = 13.2
            sb = FancyBboxPatch((l2_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                                facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
            ax.add_patch(sb)
            ax.text(l2_x + 2.2, sy + 11.2, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
            ax.text(l2_x + 2.2, sy + 5.2, sdesc, fontsize=6.8, color='#1e293b', linespacing=1.25, family='monospace', zorder=4)
        elif i == 0:
            sy = l2_y + 27.5
            sh = 4.2
            sb = FancyBboxPatch((l2_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                                facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
            ax.add_patch(sb)
            ax.text(l2_x + 2.2, sy + 2.6, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
            ax.text(l2_x + 2.2, sy + 1.0, sdesc, fontsize=7.0, color='#334155', zorder=4)
        elif i == 2:
            sy = l2_y + 7.5
            sh = 5.6
            sb = FancyBboxPatch((l2_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                                facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
            ax.add_patch(sb)
            ax.text(l2_x + 2.2, sy + 3.8, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
            ax.text(l2_x + 2.2, sy + 1.6, sdesc, fontsize=7.0, color='#334155', zorder=4)
        elif i == 3:
            sy = l2_y + 1.2
            sh = 5.6
            sb = FancyBboxPatch((l2_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                                facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
            ax.add_patch(sb)
            ax.text(l2_x + 2.2, sy + 3.8, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
            ax.text(l2_x + 2.2, sy + 1.6, sdesc, fontsize=7.0, color='#334155', zorder=4)

    # ----------------------------------------------------
    # CONTENT INSIDE LAYER 3: ML CLASSIFICATION
    # ----------------------------------------------------
    l3_x, l3_y = coords[2][0], coords[2][1]
    sub_blocks_l3 = [
        ("Multi-Classifier Benchmark", "• XGBoost (300 Estimators, Depth=6) → Acc: 94.28%\n• Random Forest (200 Trees) → Recall: 93.31%\n• MLP Neural Network (128x64 Units) → Acc: 93.68%", "#fed7aa", "#c2410c"),
        ("Multi-Class Diagnostic Labels", "• Class 0: Healthy High-Vigor Crops\n• Class 1: Moderate Moisture / Canopy Stress\n• Class 2: Severe Nutrient / Disease Damage\n• Class 3: Non-Agricultural / Roof Structures", "#ffedd5", "#9a3412"),
        ("Performance Metrics Validation", "ROC-AUC: 97.53% | PR-AUC: 97.74%\nHamming Loss: 0.0572 | Jaccard: 88.58%", "#fff7ed", "#7c2d12")
    ]
    sy_offsets_l3 = [(l3_y + 20.5, 11.2), (l3_y + 8.5, 11.2), (l3_y + 1.2, 6.5)]
    for i, ((stitle, sdesc, sbg, stxt), (sy, sh)) in enumerate(zip(sub_blocks_l3, sy_offsets_l3)):
        sb = FancyBboxPatch((l3_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                            facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
        ax.add_patch(sb)
        ax.text(l3_x + 2.2, sy + sh - 2.5, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
        ax.text(l3_x + 2.2, sy + 1.2, sdesc, fontsize=7.0, color='#334155', linespacing=1.25, zorder=4)

    # ----------------------------------------------------
    # CONTENT INSIDE LAYER 4: EXPLAINABLE AI (SHAP)
    # ----------------------------------------------------
    l4_x, l4_y = coords[3][0], coords[3][1]
    sub_blocks_l4 = [
        ("SHAP Game-Theoretic Framework", "TreeSHAP & KernelSHAP Additive Values:\ng(z') = φ₀ + ∑ φᵢ zᵢ' with Local Fidelity", "#e9d5ff", "#7e22ce"),
        ("Feature Importance Ranking", "1. NDVI (Mean |SHAP| = 0.1322) [Dominant]\n2. NDRE (Mean |SHAP| = 0.1041) [Chlorophyll]\n3. EVI (0.0820) | SAVI (0.0710) | NDBI (0.0512)", "#f3e8ff", "#6b21a8"),
        ("Model Verification & Trust", "Quantifies spectral vs meteorological contribution\nEliminates black-box decisions for agronomists", "#faf5ff", "#581c87")
    ]
    sy_offsets_l4 = [(l4_y + 22.0, 9.5), (l4_y + 10.5, 10.5), (l4_y + 1.5, 8.0)]
    for i, ((stitle, sdesc, sbg, stxt), (sy, sh)) in enumerate(zip(sub_blocks_l4, sy_offsets_l4)):
        sb = FancyBboxPatch((l4_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                            facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
        ax.add_patch(sb)
        ax.text(l4_x + 2.2, sy + sh - 2.4, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
        ax.text(l4_x + 2.2, sy + 1.2, sdesc, fontsize=7.0, color='#334155', linespacing=1.25, zorder=4)

    # ----------------------------------------------------
    # CONTENT INSIDE LAYER 5: GEMINI AI OPTIMIZATION
    # ----------------------------------------------------
    l5_x, l5_y = coords[4][0], coords[4][1]
    sub_blocks_l5 = [
        ("Multi-Modal Agronomic Reasoning", "Google Gemini Pro/Flash API Engine\nInputs: Temporal Revisit + Class + Weather Risk", "#99f6e4", "#0f766e"),
        ("Resource Optimization Engine", "• Irrigation: ET0 - 7-day effective rainfall\n• N-P-K: Stage-based variable-rate dosage\n• Fungal/Pest: Temp/humidity bio-risk spray", "#ccfbf1", "#115e59"),
        ("Agronomic Impact Achievements", "• Daily Cost Reduction: up to 59.82%\n• 14-Day Canopy Recovery: >100% Target\n• Water conservation & zero fertilizer runoff", "#f0fdfa", "#134e4a")
    ]
    sy_offsets_l5 = [(l5_y + 22.0, 9.5), (l5_y + 10.5, 10.5), (l5_y + 1.5, 8.0)]
    for i, ((stitle, sdesc, sbg, stxt), (sy, sh)) in enumerate(zip(sub_blocks_l5, sy_offsets_l5)):
        sb = FancyBboxPatch((l5_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                            facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
        ax.add_patch(sb)
        ax.text(l5_x + 2.2, sy + sh - 2.4, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
        ax.text(l5_x + 2.2, sy + 1.2, sdesc, fontsize=7.0, color='#334155', linespacing=1.25, zorder=4)

    # ----------------------------------------------------
    # CONTENT INSIDE LAYER 6: DECISION SUPPORT / OUTPUT
    # ----------------------------------------------------
    l6_x, l6_y = coords[5][0], coords[5][1]
    sub_blocks_l6 = [
        ("Farmer Advisory & Action Plan", "14-Day Day-by-Day Precision Schedule:\nIrrigation liters/acre, fertilizer timing, sprays", "#e2e8f0", "#1e293b"),
        ("Executive Intelligence Dashboard", "Streamlit & React Web GIS Interface:\nInteractive NDVI heatmap, health charts & zones", "#f1f5f9", "#334155"),
        ("Automated Agronomic PDF Report", "Complete audit trail with multi-band evidence,\nfinancial cost savings, and advisory summary", "#f8fafc", "#475569")
    ]
    sy_offsets_l6 = [(l6_y + 22.0, 9.5), (l6_y + 11.0, 10.0), (l6_y + 1.5, 8.5)]
    for i, ((stitle, sdesc, sbg, stxt), (sy, sh)) in enumerate(zip(sub_blocks_l6, sy_offsets_l6)):
        sb = FancyBboxPatch((l6_x + 1.2, sy), col_w - 2.4, sh, boxstyle="round,pad=0.15,rounding_size=0.5",
                            facecolor='#ffffff', edgecolor=sbg, linewidth=1.2, zorder=3)
        ax.add_patch(sb)
        ax.text(l6_x + 2.2, sy + sh - 2.4, f"• {stitle}", fontsize=8.2, fontweight='bold', color=stxt, zorder=4)
        ax.text(l6_x + 2.2, sy + 1.2, sdesc, fontsize=7.0, color='#334155', linespacing=1.25, zorder=4)

    # ----------------------------------------------------
    # CONNECTOR ARROWS BETWEEN STAGES (PIPELINE DATA FLOW)
    # ----------------------------------------------------
    arrow_style = dict(arrowstyle="simple,head_width=1.0,head_length=1.2", linewidth=1.5)

    # 1. Layer 1 -> Layer 2 (Top Left to Top Mid)
    ax.annotate("", xy=(35.5, 72.2), xytext=(32.0, 72.2),
                arrowprops=dict(facecolor='#2563eb', edgecolor='#1d4ed8', **arrow_style), zorder=10)
    ax.text(33.75, 73.8, "Raw Bands\n& Weather", fontsize=6.8, fontweight='bold', ha='center', va='center', color='#1d4ed8')

    # 2. Layer 2 -> Layer 3 (Top Mid to Top Right)
    ax.annotate("", xy=(68.0, 72.2), xytext=(64.0, 72.2),
                arrowprops=dict(facecolor='#059669', edgecolor='#047857', **arrow_style), zorder=10)
    ax.text(66.0, 73.8, "5 Indices &\nFeatures", fontsize=6.8, fontweight='bold', ha='center', va='center', color='#047857')

    # 3. Layer 3 -> Layer 4 (Top Right down to Bottom Right)
    ax.annotate("", xy=(82.2, 46.5), xytext=(82.2, 54.0),
                arrowprops=dict(facecolor='#ea580c', edgecolor='#c2410c', **arrow_style), zorder=10)
    ax.text(85.8, 50.2, "Model Weights\n& Predictions", fontsize=6.8, fontweight='bold', ha='left', va='center', color='#c2410c')

    # 4. Layer 4 -> Layer 5 (Bottom Right to Bottom Mid)
    ax.annotate("", xy=(64.0, 28.2), xytext=(68.0, 28.2),
                arrowprops=dict(facecolor='#7e22ce', edgecolor='#6b21a8', **arrow_style), zorder=10)
    ax.text(66.0, 29.8, "SHAP Values &\nClass State", fontsize=6.8, fontweight='bold', ha='center', va='center', color='#6b21a8')

    # 5. Layer 5 -> Layer 6 (Bottom Mid to Bottom Left)
    ax.annotate("", xy=(32.0, 28.2), xytext=(35.5, 28.2),
                arrowprops=dict(facecolor='#0d9488', edgecolor='#0f766e', **arrow_style), zorder=10)
    ax.text(33.75, 29.8, "Optimized\nSchedule", fontsize=6.8, fontweight='bold', ha='center', va='center', color='#0f766e')

    # Footer Caption / IEEE Legend
    footer_text = (
        "Fig. 1. End-to-end operational architecture of the proposed AI-based precision agriculture system, illustrating the sequential progression from Sentinel-2 "
        "multispectral data ingestion and feature engineering to multi-model ML crop stress classification, SHAP feature explainability, and Gemini AI agronomic optimization."
    )
    ax.text(50, 2.2, footer_text, fontsize=8.2, style='italic', ha='center', va='center', color='#334155', wrap=True)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"[SUCCESS] Saved IEEE Fig 1 Architecture Diagram to: {output_path}")

if __name__ == "__main__":
    out_dir = r"c:\College Work\Fin_pro\backend\reports\ieee_paper_assets"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "fig1_system_architecture.png")
    create_ieee_architecture_diagram(out_file)
