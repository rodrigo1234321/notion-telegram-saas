"""
Single source of truth for calendar event reminder rules.
Maps event categories to default reminder offset minutes.
"""

DEFAULT_REMINDER_MINUTES = {
    "medicamento": 0,
    "pastilla": 0,
    "remimed": 0,
    "reunion": 30,
    "reunión": 30,
    "cita": 30,
    "evento": 15,
    "trabajo": 15,
    "personal": 15,
    "general": 15,
}

REMINDER_MESSAGES = {
    0: "⏰ <b>RECORDATORIO:</b> ¡<b>{title}</b> es AHORA ({time} hs)! 💊",
    15: "⏰ <b>RECORDATORIO:</b> <b>{title}</b> empieza en 15 minutos ({time} hs). 🔔",
    30: "⏰ <b>RECORDATORIO:</b> <b>{title}</b> empieza en 30 minutos ({time} hs). 🔔",
    60: "⏰ <b>RECORDATORIO:</b> <b>{title}</b> empieza en 1 hora ({time} hs). 🔔",
    None: "⏰ <b>RECORDATORIO:</b> <b>{title}</b> empieza pronto ({time} hs). 🔔",
}


def get_default_reminder_minutes(category: str | None) -> int:
    """Return default reminder offset minutes based on category."""
    if not category:
        return 15
    cat_lower = category.lower().strip()
    for key, minutes in DEFAULT_REMINDER_MINUTES.items():
        if key in cat_lower:
            return minutes
    return 15
