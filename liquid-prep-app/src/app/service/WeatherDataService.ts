import { Inject, Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { WeatherResponse } from '../models/api/WeatherResponse';
import { WeatherInfo, TodayWeather } from '../models/TodayWeather';
import { DataService } from './DataService';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';
import { DateTimeUtil } from '../utility/DateTimeUtil';
import { HttpClient } from '@angular/common/http';
import weatherIconMapping from '../models/json/weatherIconMapping.json';

const TODAY_WEATHER = 'today-weather';

@Injectable({
  providedIn: 'root',
})
export class WeatherDataService {
  public today = new TodayWeather();
  private dateTimeUtil;
  constructor(
    private dataService: DataService,
    @Inject(LOCAL_STORAGE) private localStorage: StorageService,
    private http: HttpClient
  ) {
    this.dateTimeUtil = new DateTimeUtil();
  }

  public getTodayWeather(): Observable<TodayWeather> {
    const self = this;
    // check if the weather data stored locally is valid for today
    // else get today weather data from backend
    const localTodayWeather = self.getTodayWeatherFromLocalStorage();
    if (localTodayWeather) {
      if (self.dateTimeUtil.isToday(localTodayWeather.date)) {
        return new Observable((observer: Observer<TodayWeather>) => {
          observer.next(localTodayWeather);
          observer.complete();
        });
      } else {
        // in the am, isToday will be false,and no 'Today' data from weather api
        const now = Date.now();
        if (
          localTodayWeather.weatherUpdateTs &&
          ((now - localTodayWeather.weatherUpdateTs) / 1000000) * 60 < 60
        ) {
          return new Observable((observer: Observer<TodayWeather>) => {
            observer.next(localTodayWeather);
            observer.complete();
          });
        } else {
          return new Observable((observer: Observer<TodayWeather>) => {
            this.dataService.getWeatherInfo().subscribe({
              next(weatherInfo: WeatherResponse) {
                this.today = self.createTodayWeather(weatherInfo);
                self.storeTodayWeatherInLocalStorage(this.today);
                observer.next(this.today);
                observer.complete();
              },
              error(err) {
                observer.error(
                  'Error getting weather data: ' +
                    (err.message ? err.message : err)
                );
              },
            });
          });
        }
      }
    } else {
      return new Observable((observer: Observer<TodayWeather>) => {
        if (self.today.dayOfWeek) {
          observer.next(self.today);
          observer.complete();
        } else {
          this.dataService.getWeatherInfo().subscribe({
            next(weatherInfo: WeatherResponse) {
              this.today = self.createTodayWeather(weatherInfo);
              self.storeTodayWeatherInLocalStorage(this.today);
              observer.next(this.today);
              observer.complete();
            },
            error(err) {
              console.error(
                'Error getting weather data: ' +
                  (err.message ? err.message : err)
              );
            },
          });
        }
      });
    }
  }

  public createTodayWeather(weatherData: WeatherResponse) {
    const weatherInfo = weatherData.data;
    const weatherToday = new TodayWeather();
    weatherToday.dayOfWeek = weatherInfo.dayOfWeek[0];
    weatherToday.narrative = weatherInfo.narrative[0];
    weatherToday.sunriseTime = weatherInfo.sunriseTimeLocal[0];
    weatherToday.sunsetTime = weatherInfo.sunsetTimeLocal[0];
    weatherToday.maxTemperature = weatherInfo.calendarDayTemperatureMax[0];
    weatherToday.minTemperature = weatherInfo.calendarDayTemperatureMin[0];
    weatherToday.date = this.dateTimeUtil.extractDateFromDateTime(
      weatherInfo.validTimeLocal[0]
    );
    weatherToday.weatherUpdateTs = Date.now();

    const dayPart = weatherInfo.daypart[0];

    const dayTime = new WeatherInfo();
    const nightTime = new WeatherInfo();
    const nextDayTime = new WeatherInfo();

    dayTime.narrative = dayPart.narrative[0];
    dayTime.precipChance = dayPart.precipChance[0];
    dayTime.precipType = dayPart.precipType[0];
    dayTime.precipitaion = dayPart.qpf[0];
    dayTime.humidity = dayPart.relativeHumidity[0];
    dayTime.uvIndex = dayPart.uvIndex[0];
    dayTime.temperature = dayPart.temperature[0];
    dayTime.windSpeed = dayPart.windSpeed[0];
    dayTime.iconCode = dayPart.iconCode[0];

    nightTime.narrative = dayPart.narrative[1];
    nightTime.precipChance = dayPart.precipChance[1];
    nightTime.precipType = dayPart.precipType[1];
    nightTime.precipitaion = dayPart.qpf[1];
    nightTime.humidity = dayPart.relativeHumidity[1];
    nightTime.uvIndex = dayPart.uvIndex[1];
    nightTime.temperature = dayPart.temperature[1];
    nightTime.windSpeed = dayPart.windSpeed[1];
    nightTime.iconCode = dayPart.iconCode[1];

    nextDayTime.narrative = dayPart.narrative[2];
    nextDayTime.precipChance = dayPart.precipChance[2];
    nextDayTime.precipType = dayPart.precipType[2];
    nextDayTime.precipitaion = dayPart.qpf[2];
    nextDayTime.humidity = dayPart.relativeHumidity[2];
    nextDayTime.uvIndex = dayPart.uvIndex[2];
    nextDayTime.temperature = dayPart.temperature[2];
    nextDayTime.windSpeed = dayPart.windSpeed[2];
    nextDayTime.iconCode = dayPart.iconCode[2];
    nextDayTime.temperatureMax = weatherInfo.calendarDayTemperatureMax[1];
    nextDayTime.temperatureMin = weatherInfo.calendarDayTemperatureMin[1];

    if (dayTime.iconCode) {
      dayTime.iconImageUrl =
        weatherIconMapping.weatherIconMap[dayTime.iconCode].url;
    } else {
      dayTime.iconImageUrl = null;
    }
    if (nightTime.iconCode) {
      nightTime.iconImageUrl =
        weatherIconMapping.weatherIconMap[nightTime.iconCode].url;
    }
    if (nextDayTime.iconCode) {
      nextDayTime.iconImageUrl =
        weatherIconMapping.weatherIconMap[nextDayTime.iconCode].url;
    }

    weatherToday.dayTime = dayTime;
    weatherToday.nightTime = nightTime;
    weatherToday.nextDayTime = nextDayTime;
    return weatherToday;
  }

  public storeTodayWeatherInLocalStorage(todayWeather: TodayWeather) {
    this.localStorage.set(TODAY_WEATHER, todayWeather);
  }

  public getTodayWeatherFromLocalStorage(): TodayWeather {
    return this.localStorage.get(TODAY_WEATHER);
  }

  // determine if its raining more than 25%
  public isRaining(weatherInfo: WeatherInfo) {
    if (
      weatherInfo.precipType === 'rain' ||
      weatherInfo.precipType === 'precip'
    ) {
      if (weatherInfo.precipChance > 25) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  // Referred - https://www.britannica.com/technology/agricultural-technology/Weather-conditions-and-controls#ref558352
  public determineTemperatureIndex(temp: number) {
    if (temp < 5) {
      return 'LOW';
    } else if (temp >= 5 && temp <= 25) {
      return 'OPTIMUM';
    } else if (temp > 25 && temp < 30) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }

  public determineRainIndex(precip: number) {
    if (precip >= 25 && precip < 50) {
      return 'LOW';
    } else if (precip >= 50 && precip < 75) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }
}
