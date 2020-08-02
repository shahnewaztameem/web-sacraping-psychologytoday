var fs = require('fs')
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const json2csv = require('json2csv').Parser;
// make data directory if not exists
const dir = './data';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
  fs.mkdirSync(dir + '/out');
}

(async () => {

  const links = [];
  const link = 'https://www.psychologytoday.com/us/therapists/texas?sid=5f24754ac58cc&rec_next=1';
  links.push(link)
  const extractLast = link.split('/').splice(-1)[0];
  for (var i = 1; i < 3; i++) {
    id = (i * 20) + 1;
    links.push('https://www.psychologytoday.com/us/therapists/texas?sid=5f24754ac58cc&rec_next=' + id);
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  for (url of links) {
    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    await getData(url);
  }
  await browser.close();
  console.log(links);
})();


// get the page data
async function getData(url) {
  // store all the links to an array
  const links = [];

  console.log(url);
  const res = await axios(url);
  const data = await res.data;


  // extract all the links from data
  const $ = await cheerio.load(data);
  const getAllLinks = await $('.col-tight-left.details-column > div:nth-child(1)').find('a').each(function () {
    links.push($(this).attr('href'));
    //console.log(($(this).attr('href')));
  })
  console.log(links)

  await gotoLinks(links);
}

// go to / open every single links
async function gotoLinks(urls) {
  const browser = await puppeteer.launch({ headless: false });

  // loop through every page and open
  for (url of urls) {
    const page = await browser.newPage();
    const link = await page.goto(url, { waitUntil: 'load', timeout: 0 });

    // extract data
    const extract = await extractData(url);
    await page.close();
  }
  await browser.close();
}

// extract data from single page
async function extractData(url) {
  const res = await axios(url);
  const data = await res.data;
  const $ = await cheerio.load(data);

  const name = await $('.name-title-column > h1').text().trim();
  const telephone = await $('.profile-phone-column > div > span > a').text();

  // get the redirected url and go to that url
  const redirectedUrl = await $('a.btn.btn-md.btn-profile.btn-default.hidden-sm-down').attr('href');

  const webAddress = await getRedirectedAddress(redirectedUrl);

  const obj = { name, telephone, webAddress };

  const save = await saveData(obj);

}

// save to file
async function saveData(data) {
  const save = await fs.appendFileSync(`data/out/info.json`, JSON.stringify(data, null, 4) + ',' + '\r\n', 'utf-8');

  // save to csv

  const j2csv = new json2csv();
  const csv = j2csv.parse(data);

  const saveFile = await fs.appendFileSync('./data/out/info.csv', csv, 'utf-8');

}

async function getRedirectedAddress(url) {
  if (url) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const link = await page.goto(url, { waitUntil: 'load', timeout: 0 });

    // get the page data and extract email from it
    const res = await axios.get(url, { validateStatus: false });
    const data = await res.data;

    let email = '';
    if (extractEmails(data)) {
      email = extractEmails(data);
      if (email === null) {
        const dom = new JSDOM(data);
        email = dom.window.document.querySelector("a[href^='mailto:']").textContent
      }
    } else {
      email = 'N/A'
    }
    console.log(email)
    page.close();
    browser.close();
    return {
      url: page.url(),
      email: email
    }
  } else {
    return {
      url: 'N/A',
      email: 'N/A'
    }
  }
}

// extract from plain html
function extractEmails(text) {
  return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
}



/* (async function url() {
 const browser = await puppeteer.launch({ headless: false });
 const page = await browser.newPage();
 const link = await page.goto('https://rachelleonardlicsw.vpweb.com/', { waitUntil: 'load' });

 const res = await axios('https://rachelleonardlicsw.vpweb.com/');
 const data = res.data;

 // function extractEmails(text) {
 //   return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
 // }

 //const dom = new JSDOM(data);
 //console.log(dom.window.document.querySelector("a[href^='mailto:']"))
 //console.log(dom)
 //console.log(dom.window.document.querySelector("a[href^='mailto:']").textContent)
 //const email = dom.window.document.querySelector("a[href^='mailto:']").textContent
 const email = extractEmails(data);
 function extractEmails(text) {
   return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
 }
 console.log(email);
 browser.close();

})();  */

//document.querySelector("a[href^='mailto:']").innerText
/*
(async function (url) {
  // store all the links to an array
  const links = [];
  //const browser = await puppeteer.launch({ headless: false });
  //const page = await browser.newPage();
  //await page.goto(url, { waitUntil: 'load', timeout: 0 });


  const res = await axios.get('https://www.psychologytoday.com/us/therapists/texas?sid=5f24754ac58cc&rec_next=1');
  const data = await res.data;

  const $ = await cheerio.load(data);
  const getAllLinks = await $('.col-tight-left.details-column > div:nth-child(1)').find('a').each(function () {
    links.push($(this).attr('href'));
    //console.log(($(this).attr('href')));
  })

  console.log(links)
  fs.writeFileSync('./data/out/data.html', data);

  // extract all the links from data
  //browser.close();

})('https://www.psychologytoday.com/us/therapists/texas?sid=5f24754ac58cc&rec_next=1') */