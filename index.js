const query = process.argv[2];
if (!query) return console.error('Exemplo de uso: npx previsao Brasilia');

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
        if (item.id === query || latinize(item.nome.toLowerCase()) === latinize(query.toLowerCase())) {
            queryPrevMet(item.id);
        }
    }
}

function queryPrevMet(id) {
    let url = `https://apiprevmet3.inmet.gov.br/previsao/${id}`;
    getHTTPS(url).then(data => {
        let result = data[id];
        if (!result) return console.error(`Dados do id ${id} não encontrados.`);

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

        prettyPrint(resumed);
    });
}

function prettyPrint(data) {
    for (let day in data) {
        let item = data[day];
        console.log(`- ${day}`);
        for (let period in item) {
            let p = item[period];
            let string_period = getString(period);
            console.log(`
            ${string_period}:
                ${p.resumo}
                Vento: ${p.dir_vento} ${p.int_vento.toLowerCase()}
                Temperatura: ${p.temp_min}º min / ${p.temp_max}º max
                Umidade: ${p.umidade_min}% min / ${p.umidade_max}% max`)
        }
        console.log('\n');
    }
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