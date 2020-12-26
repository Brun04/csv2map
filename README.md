# Csv2Map

A mini-project which proposed different API to geocode a CSV and display the results on a map. These are also available in a table under the map and can be downloaded after the processing.

## Requirements

The project uses the library **PapaParse** to parse a CSV file. You can download it at [https://www.papaparse.com/](https://www.papaparse.com/) (version 5.0.2 is compatible). The folder containing PapaParse must be set in `src/`, next to the `index.html`.

## Installation

Rename the file `geocoders.json.ini` in `geocoders.json`. Open it and replace the pattern *YOUR_ACCESS_KEY* when you have access to a key for the wanted geocoder. Three geocoders are parametred and proposed:

|                                API                               |                   Sign up required                  | Key required |           Comment          |
|:----------------------------------------------------------------:|:---------------------------------------------------:|:------------:|:--------------------------:|
|  [Base Adresse Nationale (BAN)](https://geo.api.gouv.fr/adresse) |                          No                         |      No      | French governmental<br>API |
| [Koumoul](https://koumoul.com/s/geocoder/api-doc) (free version) | No (but the number<br>of queries is very limited)   |      No      |                            |
|     [Positionstack](https://positionstack.com/documentation)     |                         Yes                         |      Yes     |                            |




## Author

© Bruno Verchère 2020