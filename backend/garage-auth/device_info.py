import re


def parse_device(user_agent: str) -> str:
    """Определяет короткое человекочитаемое название устройства и браузера
    по строке User-Agent — без внешних библиотек, простыми регулярками.
    Например: «iPhone, Safari», «Android, Chrome», «Windows, Chrome»."""
    ua = user_agent or ''

    if re.search(r'iPhone', ua):
        platform = 'iPhone'
    elif re.search(r'iPad', ua):
        platform = 'iPad'
    elif re.search(r'Android', ua):
        platform = 'Android'
    elif re.search(r'Macintosh|Mac OS X', ua):
        platform = 'Mac'
    elif re.search(r'Windows', ua):
        platform = 'Windows'
    elif re.search(r'Linux', ua):
        platform = 'Linux'
    else:
        platform = 'Неизвестное устройство'

    if re.search(r'EdgA|Edge|Edg/', ua):
        browser = 'Edge'
    elif re.search(r'OPR|Opera', ua):
        browser = 'Opera'
    elif re.search(r'YaBrowser', ua):
        browser = 'Яндекс.Браузер'
    elif re.search(r'CriOS|Chrome', ua):
        browser = 'Chrome'
    elif re.search(r'FxiOS|Firefox', ua):
        browser = 'Firefox'
    elif re.search(r'Version/.*Safari', ua) or (re.search(r'Safari', ua) and not re.search(r'Chrome', ua)):
        browser = 'Safari'
    else:
        browser = ''

    return f'{platform}, {browser}' if browser else platform
