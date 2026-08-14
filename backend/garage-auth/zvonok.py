import os
import requests

ZVONOK_BASE_URL = 'https://zvonok.com/manager/cabapi_external/api/v1'


class ZvonokError(Exception):
    pass


def start_flashcall(phone_e164: str) -> dict:
    """Запрашивает Flash Call через Zvonok.com: сервис звонит на номер клиента,
    а последние 4 цифры номера, с которого поступит звонок, служат кодом
    подтверждения. Возвращает call_id и pincode — ожидаемые 4 цифры, которые
    нужно будет сравнить с тем, что введёт клиент."""
    public_key = os.environ['ZVONOK_PUBLIC_KEY']
    campaign_id = os.environ['ZVONOK_CAMPAIGN_ID']
    resp = requests.post(
        f'{ZVONOK_BASE_URL}/phones/flashcall/',
        data={'public_key': public_key, 'campaign_id': campaign_id, 'phone': phone_e164},
        timeout=15,
    )
    data = resp.json()
    if data.get('status') != 'ok':
        raise ZvonokError(data.get('data') or 'Не удалось совершить звонок')
    call_data = data['data']
    pincode = str(call_data.get('pincode') or '').strip().zfill(4)
    return {'call_id': call_data.get('call_id'), 'pincode': pincode}
