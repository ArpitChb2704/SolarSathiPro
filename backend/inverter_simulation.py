# inverter_simulator.py

import random
import requests
import numpy as np
import pandas as pd
import pvlib
from weather_service import get_today_weather



# =========================================================
# MAIN SIMULATION
# =========================================================

def simulate_inverter_generation(
    lat: float,
    lon: float,
    capacity_kw: float,
    tilt: float,
    azimuth: float
):

    # =====================================================
    # FETCH WEATHER
    # =====================================================

    df = get_today_weather(lat, lon)

    df = df[df["ghi"] > 20].copy()

    times = pd.DatetimeIndex(pd.to_datetime(df["time"]))

    df.index = times

    # =====================================================
    # SOLAR POSITION
    # =====================================================

    solar_position = pvlib.solarposition.get_solarposition(
        time=times,
        latitude=lat,
        longitude=lon
    )

    # =====================================================
    # DNI USING DISC MODEL
    # =====================================================

    dni_data = pvlib.irradiance.disc(
        ghi=df["ghi"].values,
        solar_zenith=solar_position["apparent_zenith"].values,
        datetime_or_doy=times.dayofyear
    )

    dni = dni_data["dni"]

    # =====================================================
    # DHI
    # =====================================================

    dhi = df["ghi"].values - (
        dni *
        np.cos(
            np.radians(
                solar_position["apparent_zenith"].values
            )
        )
    )

    dhi = np.clip(dhi, 0, None)

    # =====================================================
    # POA IRRADIANCE
    # =====================================================

    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=tilt,
        surface_azimuth=azimuth,
        dni=dni,
        ghi=df["ghi"].values,
        dhi=dhi,
        solar_zenith=solar_position["apparent_zenith"],
        solar_azimuth=solar_position["azimuth"]
    )

    # =====================================================
    # CELL TEMPERATURE
    # =====================================================

    temp_cell = pvlib.temperature.sapm_cell(
        poa_global=poa["poa_global"],
        temp_air=df["temperature"].values,
        wind_speed=df["wind_speed"].values,
        a=-3.47,
        b=-0.0594,
        deltaT=3
    )

    # =====================================================
    # PV SYSTEM MODEL
    # =====================================================

    pdc0 = capacity_kw * 1000

    dc_power = pvlib.pvsystem.pvwatts_dc(
        effective_irradiance=poa["poa_global"],
        temp_cell=temp_cell,
        pdc0=pdc0,
        gamma_pdc=-0.0035
    )

    ac_power = pvlib.inverter.pvwatts(
        pdc=dc_power,
        pdc0=pdc0
    )

    ac_power = np.clip(ac_power, 0, None)

    ac_power_kw = ac_power / 1000

    # =====================================================
    # REALISTIC INVERTER BEHAVIOR
    # =====================================================

    # 1. Inverter efficiency
    inverter_efficiency = random.uniform(0.98, 0.99)

    ac_power_kw *= inverter_efficiency

    # 2. Soiling losses
    soiling_loss = random.uniform(0.005, 0.015)

    ac_power_kw *= (1 - soiling_loss)

    # 3. Wiring losses
    wiring_loss = random.uniform(0.005, 0.015)

    ac_power_kw *= (1 - wiring_loss)

    # 4. Cloud fluctuation randomness
    fluctuation = np.random.normal(
    loc=1.01,
    scale=0.02,
    size=len(ac_power_kw)
    )

    ac_power_kw *= fluctuation

    # 5. Sensor noise
    sensor_noise = np.random.normal(
    loc=0,
    scale=0.005,
    size=len(ac_power_kw)
    )

    ac_power_kw += sensor_noise

    # 6. Random shading events
    for i in range(len(ac_power_kw)):

        if random.random() < 0.03:

            reduction = random.uniform(0.75, 0.95)

            ac_power_kw.iloc[i] = ac_power_kw.iloc[i] * reduction

    # 7. Inverter clipping
    inverter_limit = capacity_kw * 0.99

    ac_power_kw = np.clip(
        ac_power_kw,
        0,
        inverter_limit
    )

    # 8. Random inverter fault
    if random.random() < 0.01:

        start = random.randint(
            0,
            max(1, len(ac_power_kw) - 2)
        )

        duration = random.randint(1, 2)

        ac_power_kw[start:start+duration] = 0

    # =====================================================
    # FINAL CLEANUP
    # =====================================================

    ac_power_kw = np.clip(ac_power_kw, 0, None)
    # Small calibration boost
    ac_power_kw *= random.uniform(1.01, 1.04)

    # =====================================================
    # DAILY ENERGY
    # =====================================================

    actual_daily_energy_kwh = float(ac_power_kw.sum())

    ideal_daily_energy_kwh = float(
        (ac_power / 1000).sum()
    )

    performance_ratio = (
        actual_daily_energy_kwh /
        ideal_daily_energy_kwh
        if ideal_daily_energy_kwh > 0
        else 0
    )

    # =====================================================
    # FORMAT HOURLY DATA
    # =====================================================

    hourly_data = []

    for i in range(len(df)):

        hourly_data.append({
            "time": str(df.index[i]),
            "generation_kw":
                round(float(ac_power_kw.iloc[i]), 3)
        })

    # =====================================================
    # RETURN
    # =====================================================

    return {

        "actual_daily_energy_kwh":
            round(actual_daily_energy_kwh, 2),

        "ideal_daily_energy_kwh":
            round(ideal_daily_energy_kwh, 2),

        "performance_ratio":
            round(performance_ratio, 3),

        "weather_summary": {

            "avg_temperature":
                round(float(df["temperature"].mean()), 2),

            "avg_cloud_cover":
                round(float(df["cloud_cover"].mean()), 2),

            "avg_wind_speed":
                round(float(df["wind_speed"].mean()), 2)
        },

        "losses": {

            "inverter_efficiency":
                round(inverter_efficiency, 3),

            "soiling_loss_percent":
                round(soiling_loss * 100, 2),

            "wiring_loss_percent":
                round(wiring_loss * 100, 2)
        },

        "hourly_generation":
            hourly_data
    }
