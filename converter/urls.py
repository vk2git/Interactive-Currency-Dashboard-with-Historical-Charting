from django.urls import path
from . import views

urlpatterns = [
    path("",views.index, name="index"),
    path('get-rates/', views.get_rates, name='get-rates'),
    path('get-historical-rates/', views.get_historical_rates, name='get-historical-rates')
]