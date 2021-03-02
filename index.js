const query = process.argv[2];
if (!query) return console.error('Exemplo de uso: \x1b[1mnpx previsao brasilia\x1b[0m');

const latinize = require('latinize');
const https = require('https');
const fs = require('fs');
const path = require('path');
let ibge = 'https://www.ibge.gov.br/components/com_dados_municipios/assets/municipios.json';
let ibge_path = path.resolve(__dirname, 'ibge.json');
let ibge_data = [];

fs.stat(ibge_path, err => {
    if (err) {
        getHTTPS(ibge).then(data => {
            ibge_data = data;
            findPlace();
            fs.writeFile(ibge_path, JSON.stringify(data, null, 4), (err) => {
                if (err) { console.log(err); }
            });
        });
    }
    else {
        ibge_data = require(ibge_path);
        findPlace();
    }
});

function findPlace() {
    for (let i = 0; i < ibge_data.length; i++) {
        let item = ibge_data[i];
        if (item.id === query || (latinize(item.nome.toLowerCase()) === latinize(query.toLowerCase())) && item.id > 1000) {
            queryPrevMet(item.id);
        }
    }
}

function queryPrevMet(id) {
    let url = `https://apiprevmet3.inmet.gov.br/previsao/${id}`;
    getHTTPS(url).then(data => {
        let result = data[id];
        if (!result) return console.error(`Dados do id ${id} não encontrados. ${(data || {}).error || ''}`);

        let resumed = {};
        for (let day in result) {
            let item = result[day];

            for (let period in item) {
                if (item['manha']) {
                    if (!resumed[day]) resumed[day] = {};
                    for (let key in item[period]) {
                        if (key.split('icone').length > 1) {
                            delete item[period][key];
                        }
                    }

                    resumed[day][period] = item[period]
                }
            }
        }

        prettyPrint(resumed, id);
    });
}

const map = {
    'S': '⇑',
    'N': '⇓',
    'E': '⇐',
    'W': '⇒',
    'SE': '⇖',
    'SW': '⇗',
    'NW': '⇘',
    'NE': '⇙'
}
function getArrow(direction) {
    return map[direction];
}

function prettyPrint(data, id) {
    let cityLog = false;
    let keys = Object.keys(data).reverse();

    for (let day of keys) {
        let item = data[day];
        if (!cityLog) {
            console.log(`\n\n\x1b[1m\x1b[4m${item.manha.entidade} - ${item.manha.uf} (COD. IBGE ${id})\x1b[0m`)
            cityLog = true;
            console.log('\n');
        }

        console.log(`\x1b[1m\x1b[4m● ${day}${checkIfToday(day)}\x1b[0m`);

        for (let period in item) {
            let p = item[period];
            let string_period = getString(period);
            let dir = (p.dir_vento || '').split('-');

            console.log('\x1b[1m', `
            \x1b[4m● ${string_period}\x1b[0m (${p.resumo})`);

            console.log(`              
              Temperatura: ${p.temp_min}º min / ${p.temp_max}º max
              Vento: ${p.dir_vento} ${(p.int_vento || '').toLowerCase()} ${getArrow(dir[0])} - ${getArrow(dir[1])}
              Umidade: ${p.umidade_min}% min / ${p.umidade_max}% max`)
        }
        console.log('\n');
    }
}

function checkIfToday(day) {
    return '';
}

let translate = {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite'
}
function getString(str) {
    return translate[str];
}

function getHTTPS(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on("error", (err) => {
            reject(err.message);
        });
    })
}