const axios = require('axios')
const cheerio = require('cheerio')
const { SingleBar, Presets } = require('cli-progress')
const fs = require('fs')
const CERMATI_BASE_URL = 'https://www.cermati.com'

const scrape = async () => {
    const progressBar = new SingleBar({}, Presets.shades_classic)
    progressBar.start(100, 0)
    let incrementingProgressBar
    try {
        console.time('Time needed to write solution.json')
        const $ = await getCermatiHtmlData('/artikel')
        progressBar.update(10)
        let listOfUrl = await getListOfArticleUrl($)
        progressBar.update(40)
        incrementingProgressBar = setInterval(() => {
            if (progressBar.value < 98) {
                progressBar.increment()
            }
        }, 120)
        const articleScrapedData = await scrapeDataFromArticles(listOfUrl)
        clearInterval(incrementingProgressBar)
        progressBar.update(98)
        fs.writeFile('solution.json', JSON.stringify(articleScrapedData, null, 2), (err) => {
            if (err) throw err
            progressBar.update(100)
            progressBar.stop()
            console.timeEnd('Time needed to write solution.json')
            console.log('Scraping Success!!')
        })
    } catch (error) {
        clearInterval(incrementingProgressBar)
        progressBar.stop()
        throw error
    }
}

const getCermatiHtmlData = async (endpoints) => {
    try {
        const { data } = await axios.get(`${CERMATI_BASE_URL}${endpoints}`)
        return cheerio.load(data)
    } catch (error) {
        throw error
    }
}

const getListOfArticleUrl = async ($) => {
    try {
        let listOfUrl = []
        $('.list-of-articles').each((i, article) => {
            $(article).find('a').each((j, url) => {
                const articleUrl = $(url).attr('href')
                // JUST PUSH LIST OF ARTICLE URL INSTEAD OF ALL URL INCLUDING PROMO
                if (articleUrl.includes('artikel')) {
                    listOfUrl.push(articleUrl)
                }
            })
        })
        return listOfUrl
    } catch (error) {
        throw error
    }
}

const scrapeDataFromArticles = async (listOfUrl) => {
    let articleData = []
    for (let i in listOfUrl) {
        const $ = await getCermatiHtmlData(listOfUrl[i])
        const finalObjectData = getDataFromHtml($, listOfUrl[i])
        articleData.push(finalObjectData)
    }
    return { articles: articleData }
}

const getDataFromHtml = ($, endpoints) => {
    const finalObjResult = {}

    finalObjResult.url = CERMATI_BASE_URL + endpoints
    finalObjResult.title = $('.post-title').text()
    finalObjResult.author = $('.author-name').text().trim()
    finalObjResult.postingDate = $('.post-date').text().trim()
    finalObjResult.relatedArticles = []
    $('#body > div.container.content > div > div.col-lg-3 > div:nth-child(3) > div > ul').each((i, ul) => {
        $(ul).find('li').each((i, li) => {
            finalObjResult.relatedArticles.push({
                url: CERMATI_BASE_URL + $(li).find('a').attr('href'),
                title: $(li).find('h5.item-title').text()
            })
        })
    })
    return finalObjResult
}

scrape()