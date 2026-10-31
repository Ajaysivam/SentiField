import os
import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_report(analysis_data, output_path):
    """
    Enterprise PDF Report Generator:
    Compiles 30-Day Growth Comparison, Field Zoning/Problem Sub-Zones, Live Weather Correlation,
    14-Day Trend Predictions, Random Forest ML Risk Scores, and Plain-English Agronomic Recommendations.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#065f46'), spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=colors.HexColor('#047857'), spaceAfter=12
    )
    section_heading = ParagraphStyle(
        'SecHeading', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#1e293b'), spaceBefore=12, spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyText', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=12.5, textColor=colors.HexColor('#334155'), spaceAfter=4
    )

    story = []

    # Title Banner
    story.append(Paragraph("🌱 AI PRECISION AGRICULTURE & CROP HEALTH EXECUTIVE REPORT", title_style))
    story.append(Paragraph("Sentinel-2 Satellite Analysis, Field Zoning, Ag-Weather Correlation & 14-Day AI Trend Forecast", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#10b981'), spaceAfter=10))

    session_id = analysis_data.get("farm_session_id", "N/A")
    obs = analysis_data.get("observation_details", {})
    acq_date = obs.get("acquisition_date", "N/A")
    spacecraft = obs.get("spacecraft", "Sentinel-2")
    land_safety = analysis_data.get("land_safety", {})

    summary_data = [
        [Paragraph("<b>Farm Session ID:</b>", body_style), Paragraph(session_id, body_style)],
        [Paragraph("<b>Report Timestamp:</b>", body_style), Paragraph(datetime.datetime.now().strftime("%Y-%m-%d %H:%M UTC"), body_style)],
        [Paragraph("<b>Satellite Observation Pass:</b>", body_style), Paragraph(f"{acq_date} ({spacecraft})", body_style)],
        [Paragraph("<b>Land Type Verification:</b>", body_style), Paragraph(f"<b>{'✅ Active Farmland Verified' if land_safety.get('is_farmland') else '⚠️ Non-Agricultural Structure (House/Rooftop)'}</b>", body_style)],
    ]
    t_summary = Table(summary_data, colWidths=[170, 360])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 10))

    # Feature 3: Weather + Crop Health Correlation
    weather = analysis_data.get("weather_correlation", {})
    if weather and weather.get("status") in ["success", "fallback"]:
        story.append(Paragraph("🌧️ Live Ag-Weather & Micro-Climate Risk Correlation", section_heading))
        w_risks = weather.get("risks", {})
        w_table_data = [
            [Paragraph(f"<b>Current Temp:</b> {weather.get('temperature_c')}°C", body_style), Paragraph(f"<b>Humidity:</b> {weather.get('humidity_pct')}%", body_style)],
            [Paragraph(f"<b>7-Day Rainfall:</b> {weather.get('rain_7day_sum_mm')} mm", body_style), Paragraph(f"<b>7-Day Water Loss (ET₀):</b> {weather.get('evapotranspiration_7d_mm')} mm", body_style)],
            [Paragraph(f"<b>Fungal Blight Risk:</b> <b>{w_risks.get('fungal_blight_risk')}</b>", body_style), Paragraph(f"<b>Drought Stress Risk:</b> <b>{w_risks.get('drought_stress_risk')}</b>", body_style)]
        ]
        t_w = Table(w_table_data, colWidths=[265, 265])
        t_w.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0f9ff')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#7dd3fc')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bae6fd')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_w)
        story.append(Spacer(1, 10))

    # Feature 1: Historical 30-Day Growth Comparison
    hist = analysis_data.get("historical_comparison", {})
    if hist:
        story.append(Paragraph("📅 30-Day Historical Crop Health Comparison", section_heading))
        h_table_data = [
            [Paragraph(f"<b>Historical Pass Date:</b> {hist.get('historical_date')}", body_style), Paragraph(f"<b>Historical NDVI:</b> {hist.get('historical_mean_ndvi')}", body_style)],
            [Paragraph(f"<b>Current Pass Date:</b> {acq_date}", body_style), Paragraph(f"<b>Current NDVI:</b> {hist.get('current_mean_ndvi')}", body_style)],
            [Paragraph(f"<b>30-Day Growth Trajectory:</b> <b>{hist.get('growth_status')}</b>", body_style), Paragraph(f"<b>Biomass Delta:</b> {hist.get('percentage_change')}% ({hist.get('ndvi_delta')})", body_style)]
        ]
        t_h = Table(h_table_data, colWidths=[265, 265])
        t_h.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#86efac')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bbf7d0')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_h)
        story.append(Spacer(1, 10))

    # Feature 2: Spatial Field Zoning & Problem Sub-Zones
    prob = analysis_data.get("problem_zones", {})
    if prob:
        story.append(Paragraph("🗺️ Field Zoning & Problem Area Sub-Zones", section_heading))
        p_desc = prob.get("zone_description", "Field growth is uniform across all sub-zones.")
        story.append(Paragraph(f"<b>• Affected Sub-Zone Area:</b> {prob.get('problem_area_acres', 0.0)} acres ({prob.get('problem_area_percentage', 0.0)}% of farm)", body_style))
        story.append(Paragraph(f"<b>• Spatial Analysis Summary:</b> {p_desc}", ParagraphStyle('PDesc', parent=body_style, leftIndent=10)))
        story.append(Spacer(1, 10))

    # Feature 4: 14-Day Machine Learning Trend Prediction
    trend = analysis_data.get("trend_prediction", {})
    if trend:
        story.append(Paragraph("🔮 14-Day AI Crop Health Trend Forecast", section_heading))
        story.append(Paragraph(f"<b>• Forecast Trajectory:</b> <b>{trend.get('trend_status')}</b> (Confidence: {trend.get('prediction_confidence')}%)", body_style))
        story.append(Paragraph(f"<b>• Projected Future NDVI:</b> {trend.get('predicted_future_ndvi')} (Current: {trend.get('current_ndvi')})", body_style))
        story.append(Paragraph(f"<b>• AI Model Forecast:</b> {trend.get('summary')}", ParagraphStyle('TDesc', parent=body_style, leftIndent=10)))
        story.append(Spacer(1, 10))

    # Crop Damage & Health Breakdown
    story.append(Paragraph("🔴/🟢 Crop Damage & Health Visual Breakdown", section_heading))
    damage_data = analysis_data.get("crop_damage_health", {})
    cd_table = [["Crop Health Sector (Color Shade)", "Farm Coverage (%)"]]

    for c_key, c_info in damage_data.items():
        cd_table.append([
            c_info.get("label", c_key),
            f"{c_info.get('percentage', 0.0)}%"
        ])

    t_cd = Table(cd_table, colWidths=[370, 160])
    t_cd.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#065f46')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#047857')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_cd)
    story.append(Spacer(1, 10))

    # Gemini AI Agronomic Recommendations & Action Plan
    gem_recs = analysis_data.get("gemini_recommendations", {})
    if gem_recs:
        story.append(Paragraph("✨ Gemini AI-Powered Agronomic Recommendations", section_heading))
        
        exec_sum = gem_recs.get("executive_summary", "")
        if exec_sum:
            if isinstance(exec_sum, dict):
                grade = exec_sum.get("overall_health_grade", "B")
                headline = exec_sum.get("headline", "")
                msg = exec_sum.get("farmer_friendly_message", "")
                summary_text = f"{headline} - {msg}" if headline else msg
            else:
                grade = gem_recs.get("field_health_status", "HEALTHY")
                summary_text = str(exec_sum)

            model_info = gem_recs.get("model_used", "Gemini AI Engine")
            summary_box_data = [
                [
                    Paragraph(f"<b>Overall Farm Health Status:</b> <font color='#10b981' size=11><b>{grade}</b></font> ({model_info})", body_style)
                ],
                [
                    Paragraph(f"<b>Summary:</b> {summary_text}", body_style)
                ]
            ]
            t_ai_sum = Table(summary_box_data, colWidths=[530])
            t_ai_sum.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#16a34a')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#86efac')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(t_ai_sum)
            story.append(Spacer(1, 8))

        # Categories
        cats = gem_recs.get("categories", [])
        for cat in cats:
            if not isinstance(cat, dict):
                continue
            c_icon = cat.get("icon", "💡")
            c_title = cat.get("title", "")
            c_status = cat.get("status", "OPTIMAL")
            c_summary = cat.get("summary", "")
            c_actions = cat.get("specific_actions", [])
            
            color_hex = "#dc2626" if c_status == "CRITICAL" else "#d97706" if c_status == "ATTENTION" else "#16a34a"
            story.append(Paragraph(f"<b>{c_icon} {c_title}</b> [<font color='{color_hex}'><b>{c_status}</b></font>]", ParagraphStyle('CatTitle', parent=body_style, fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0f172a'))))
            story.append(Paragraph(f"<i>{c_summary}</i>", ParagraphStyle('CatSum', parent=body_style, leftIndent=8, textColor=colors.HexColor('#475569'))))
            for act in c_actions:
                story.append(Paragraph(f"• {act}", ParagraphStyle('CatAct', parent=body_style, leftIndent=16)))
            story.append(Spacer(1, 6))

        # Action Plan Timeline
        action_plan = gem_recs.get("action_plan", {})
        if isinstance(action_plan, dict):
            story.append(Paragraph("📅 Priority Action Timeline for Farmer", ParagraphStyle('APTitle', parent=section_heading, fontSize=11)))
            plan_data = [["Timeframe", "Priority Action Step", "Rationale"]]
            
            for item in action_plan.get("immediate_24_48h", []):
                if isinstance(item, dict):
                    plan_data.append(["Next 24-48 Hours", item.get("action", ""), item.get("reason", "")])
            for item in action_plan.get("short_term_3_7d", []):
                if isinstance(item, dict):
                    plan_data.append(["Days 3-7", item.get("action", ""), item.get("reason", "")])
            for item in action_plan.get("maintenance_8_14d", []):
                if isinstance(item, dict):
                    plan_data.append(["Days 8-14", item.get("action", ""), item.get("reason", "")])

            if len(plan_data) > 1:
                t_ap = Table(plan_data, colWidths=[110, 240, 180])
                t_ap.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#475569')),
                    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 4),
                ]))
                story.append(t_ap)
                story.append(Spacer(1, 8))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=6))
    story.append(Paragraph("© 2026 AI Precision Agriculture System — Executive Enterprise PDF Report featuring Gemini AI", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)))

    doc.build(story)
    print(f"[REPORT SERVICE] Full Executive PDF report generated: '{output_path}'")
    return output_path

