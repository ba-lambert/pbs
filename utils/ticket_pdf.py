import io
from datetime import datetime

from fpdf import FPDF


def generate_ticket_pdf(
    booking_id: int,
    passenger_name: str,
    passenger_email: str,
    seat_number: int | None,
    route_name: str,
    bus_plate: str,
    departure_at: datetime,
    origin_name: str,
    destination_name: str,
    fare_rwf: float,
    distance_km: float,
) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    # Header bar
    pdf.set_fill_color(16, 98, 70)
    pdf.rect(0, 0, 210, 38, "F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_xy(20, 10)
    pdf.cell(0, 10, "PBS Rwanda", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_x(20)
    pdf.cell(0, 6, "Public Bus Service — E-Ticket", ln=True)

    pdf.set_text_color(30, 30, 30)
    pdf.set_y(50)

    # Booking reference
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, f"Booking Reference: PBS-{booking_id:06d}", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Issued: {datetime.utcnow().strftime('%d %b %Y %H:%M')} UTC", ln=True)
    pdf.ln(4)

    # Divider
    pdf.set_draw_color(200, 200, 200)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

    def row(label: str, value: str) -> None:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(60, 6, label.upper(), ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 6, value, ln=True)

    row("Passenger", passenger_name)
    row("Email", passenger_email)
    pdf.ln(2)
    row("Route", route_name)
    row("Bus", bus_plate)
    row("Departure", departure_at.strftime("%d %b %Y at %H:%M"))
    row("Boarding at", origin_name)
    row("Alighting at", destination_name)
    row("Distance", f"{distance_km:.1f} km")
    if seat_number:
        row("Seat", str(seat_number))
    pdf.ln(4)

    # Fare box
    pdf.set_fill_color(240, 253, 244)
    pdf.set_draw_color(134, 239, 172)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(22, 101, 52)
    pdf.rect(20, pdf.get_y(), 170, 18, "FD")
    pdf.set_xy(20, pdf.get_y() + 4)
    pdf.cell(170, 10, f"FARE: {int(fare_rwf):,} RWF", align="C", ln=True)
    pdf.set_text_color(30, 30, 30)
    pdf.ln(6)

    # Footer
    pdf.set_draw_color(200, 200, 200)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(140, 140, 140)
    pdf.multi_cell(0, 5, "Present this ticket (printed or on your phone) when boarding. This ticket is non-transferable.\nFor support: support@pbs.rw")

    return pdf.output()
