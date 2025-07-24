import requests
import json
from django.core.management.base import BaseCommand
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Fetches the list of available currencies from ExchangeRate-API and saves them to a JSON file.'

    def handle(self, *args, **options):
        self.stdout.write('Fetching currency list from API...')

        try:
            api_url = f"https://v6.exchangerate-api.com/v6/{settings.API_KEY}/latest/USD"
            response = requests.get(api_url)
            response.raise_for_status()
            data = response.json()

            if data.get('result') != 'success':
                raise Exception(f"API returned an error: {data.get('error-type')}")

            currencies = list(data['conversion_rates'].keys())
            
            # Define the path to save the file
            file_path = os.path.join(settings.BASE_DIR, 'converter', 'static', 'converter', 'currencies.json')
            
            # --- THIS IS THE FIX ---
            # Ensure the directory exists before trying to write the file.
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            # ----------------------

            with open(file_path, 'w') as f:
                json.dump(currencies, f, indent=4)

            self.stdout.write(self.style.SUCCESS(f'Successfully fetched and saved {len(currencies)} currencies to {file_path}'))

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Network error fetching currencies: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'An error occurred: {e}'))
