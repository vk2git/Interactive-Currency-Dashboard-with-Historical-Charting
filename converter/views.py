import requests
import json
import os
from datetime import datetime, timedelta
from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse

def index(request):
    all_currencies = []
    graph_currencies = []

    try:
        file_path = os.path.join(settings.BASE_DIR, 'converter', 'static', 'converter', 'currencies.json')
        with open(file_path, 'r') as f:
            all_currencies = json.load(f)
    except Exception as e:
        print(f"Error reading currencies.json: {e}")
        all_currencies = ["USD", "EUR", "JPY", "GBP"]

    try:
        response = requests.get('https://api.frankfurter.app/currencies')
        response.raise_for_status()
        graph_currencies = [key for key in response.json().keys() if key != 'USD']
    except Exception as e:
        print(f"Could not fetch Frankfurter currencies: {e}")
        graph_currencies = ["EUR", "JPY", "GBP"]

    context = {
        'all_currencies': all_currencies,
        'graph_currencies': graph_currencies
    }
    return render(request, 'converter/index.html', context)


def get_rates(request):
    try:
        api_url = f"https://v6.exchangerate-api.com/v6/{settings.API_KEY}/latest/USD"
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        return JsonResponse(data)
    except requests.exceptions.RequestException as e:
        return JsonResponse({'result': 'error', 'message': f'Network error: {e}'}, status=500)


def get_historical_rates(request):
    base_currency = request.GET.get('base')
    if not base_currency:
        return JsonResponse({'error': 'A base currency is required.', 'success': False}, status=400)

    today = datetime.now()
    end_date_obj = today - timedelta(days=1)
    start_date_obj = end_date_obj - timedelta(days=29)

    start_date = start_date_obj.strftime('%Y-%m-%d')
    end_date = end_date_obj.strftime('%Y-%m-%d')

    api_url = f"https://api.frankfurter.app/{start_date}..{end_date}"
    
    quote_currency = 'EUR' if base_currency == 'USD' else 'USD'
    params = {'from': base_currency, 'to': quote_currency}

    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        data = response.json()
        data['success'] = True
        return JsonResponse(data)
    except requests.exceptions.RequestException as e:
        error_info = str(e)
        if e.response:
            error_info = f"{e.response.status_code} Client Error: {e.response.reason} for url: {e.response.url}"
        return JsonResponse({'error': error_info, 'success': False}, status=500)
        