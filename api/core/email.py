import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from api.core.config import settings


def _send_smtp(to: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password.replace(" ", ""))
        server.sendmail(settings.smtp_user, to, msg.as_string())


async def send_email(to: str, subject: str, html_body: str) -> None:
    await asyncio.to_thread(_send_smtp, to, subject, html_body)


async def send_driver_welcome(to: str, full_name: str, password: str) -> None:
    html = f"""
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #18181b;">Welcome to PBS, {full_name}!</h2>
      <p style="color: #52525b;">Your driver account has been created. Use the credentials below to log in to the PBS Driver App.</p>

      <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; color: #71717a; font-size: 13px;">EMAIL</p>
        <p style="margin: 0 0 20px; font-weight: 600; color: #18181b;">{to}</p>
        <p style="margin: 0 0 8px; color: #71717a; font-size: 13px;">TEMPORARY PASSWORD</p>
        <p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #18181b; font-family: monospace;">{password}</p>
      </div>

      <p style="color: #ef4444; font-size: 13px;">
        ⚠️ This password expires in <strong>5 minutes</strong>. You will be asked to set a new password immediately after logging in.
      </p>
      <p style="color: #71717a; font-size: 12px; margin-top: 32px;">
        If you did not expect this email, please contact your company administrator.
      </p>
    </div>
    """
    await send_email(to, "Your PBS Driver Account — Temporary Password", html)
