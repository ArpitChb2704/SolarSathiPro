import os
import base64
import pickle
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
from google.oauth2.credentials import Credentials

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_gmail_service():
    # Production: use env variables directly
    if os.environ.get("GOOGLE_REFRESH_TOKEN"):
        creds = Credentials(
            token=None,
            refresh_token=os.environ["GOOGLE_REFRESH_TOKEN"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ["GOOGLE_CLIENT_ID"],
            client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        )
        creds.refresh(Request())
    else:
        # Local: use token.pickle
        creds = None
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                creds = pickle.load(token)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                creds_dict = json.loads(os.environ.get("GOOGLE_CREDENTIALS", "{}"))
                flow = InstalledAppFlow.from_client_config(creds_dict, SCOPES)
                creds = flow.run_local_server(port=0)
            with open('token.pickle', 'wb') as token:
                pickle.dump(creds, token)

    return build('gmail', 'v1', credentials=creds)

def send_report_email(to: str, user_name: str, html_body: str):
    service = get_gmail_service()
    sender = "support.solatsathi@gmail.com"

    message = MIMEMultipart("alternative")
    message['to'] = to
    message['from'] = sender
    message['subject'] = f"☀️ Your Solar Report — {user_name}"

    # plain text fallback
    plain = MIMEText("Your solar report is attached. Please view in an HTML-compatible email client.", "plain")
    html  = MIMEText(html_body, "html")
    message.attach(plain)
    message.attach(html)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    try:
        sent = service.users().messages().send(userId='me', body={'raw': raw}).execute()
        print(f"Report sent. Message ID: {sent['id']}")
        return True
    except HttpError as e:
        print(f"Gmail error: {e}")
        return False
