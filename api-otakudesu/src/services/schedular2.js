const ScraperService = require('./scraper');
const { sequelize } = require('../config/database');
const { initModels } = require('../models');

class Scheduler {
  constructor() {
    this.initialized = false;
  }

  async init(skipOngoing = true ) {
    if (this.initialized) return;

    try {
      console.log('Initializing database models...');
      await initModels();

      console.log('Running scraping tasks without cron jobs...');
      await this.runAllTasksOnce(skipOngoing);

      this.initialized = true;
      console.log('Scheduler tasks completed successfully.');
    } catch (error) {
      console.error('Error initializing scheduler:', error);
    }
  }

  // Jalankan semua scraping sekaligus sekali jalan tanpa cron
  async runAllTasksOnce(skipOngoing = true) {
    try {
      console.log('Starting initial data scraping...');
      await ScraperService.scrapeGenres();

      if (!skipOngoing) {
        console.log('Scraping ongoing anime...');
        await this.scrapeUntilLastPage('ongoing');
      } else {
        console.log('Skipping ongoing anime scraping as requested.');
      }

      console.log('Scraping completed anime...');
      await this.scrapeUntilLastPage('completed');

      console.log('Checking for new episodes...');
      await this.runEpisodeCheck();

      console.log('All scraping tasks finished.');
    } catch (error) {
      console.error('Error running scraping tasks:', error);
    }
  }

  async scrapeUntilLastPage(type) {
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        console.log(`[${new Date().toISOString()}] Scraping ${type} anime page ${page}...`);
        const result = await (type === 'ongoing' 
          ? ScraperService.scrapeOngoingAnime(page)
          : ScraperService.scrapeCompletedAnime(page));

        if (result.isLastPage) {
          console.log(`[${new Date().toISOString()}] Reached last page of ${type} anime at page ${page}`);
          hasMorePages = false;
        } else {
          page++;
          // Delay 5 detik supaya tidak membebani server
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error(`Error scraping ${type} anime page ${page}:`, error);
        hasMorePages = false;
      }
    }
  }

  async runEpisodeCheck() {
    try {
      const results = await ScraperService.checkNewEpisodes();
      console.log('New episode check completed:', results);
      return results;
    } catch (error) {
      console.error('Error checking for new episodes:', error);
      return [];
    }
  }
}

const scheduler = new Scheduler();

module.exports = scheduler;
