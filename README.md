# CzasoPłaca — Licznik Godzin i Zarobków

Prosta, responsywna aplikacja webowa (z ciemnym i jasnym motywem) do liczenia przepracowanych godzin i automatycznego przeliczania zarobków w czasie rzeczywistym z zapisem w `localStorage`.

## Funkcje

- **Stoper Start / Stop**: Rozpoczynanie i zatrzymywanie licznika czasu pracy z zapisem do `localStorage`.
- **Przeliczanie stawki na żywo**: Automatyczne mnożenie przepracowanego czasu przez stawkę **31,50 zł/h**.
- **Autostart**: Możliwość ustawienia automatycznego startu o wybranej godzinie (zatrzymanie pracy przyciskiem **Stop** jest zawsze ręczne).
- **Tygodniowe podsumowanie (Poniedziałek – Niedziela)**: Wykres słupkowy z podziałem na dni tygodnia oraz edycja i dodawanie wpisów.
- **Archiwum do 3 tygodni wstecz**: Automatyczny zapis zamkniętych tygodni na dole strony (gdy dochodzi 4. tydzień, najstarszy zapis jest automatycznie usuwany z pamięci).

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Budowanie wersji produkcyjnej

```bash
npm run build
```

## Wdrożenie na GitHub Pages

Repozytorium zawiera gotowy plik `.github/workflows/deploy.yml`. Po wypchnięciu kodu na gałąź `main` i włączeniu w ustawieniach repozytorium **Settings → Pages → Source: GitHub Actions**, aplikacja automatycznie zbuduje się i opublikuje pod adresem GitHub Pages.
