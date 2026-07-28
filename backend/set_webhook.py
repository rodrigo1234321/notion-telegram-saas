import requests

BOT_TOKEN = "8955614393:AAE1t3EZVDqMCjhgxHKmS3kmwuADW7-XeEE"
WEBHOOK_URL = "https://notion-telegram-saas.onrender.com/bot/webhook"

def set_telegram_webhook():
    # 1. Check getWebhookInfo
    info_url = f"https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo"
    r_info = requests.get(info_url).json()
    print("Current Webhook Info:", r_info)

    # 2. Set Webhook to Render HTTPS URL
    set_url = f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url={WEBHOOK_URL}"
    r_set = requests.get(set_url).json()
    print("Set Webhook Response:", r_set)

    # 3. Verify getWebhookInfo again
    r_info2 = requests.get(info_url).json()
    print("Updated Webhook Info:", r_info2)

if __name__ == '__main__':
    set_telegram_webhook()
