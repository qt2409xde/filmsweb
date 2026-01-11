// Configuration
const CONFIG = {
    API_KEY: '4eb17c1d81ad5b5eefe3cf258342d664',
    BASE_URL: 'https://api.themoviedb.org/3/',
    IMAGE_URL: 'https://image.tmdb.org/t/p/w500',
    BACKDROP_URL: 'https://image.tmdb.org/t/p/original',
    LANGUAGE: 'vi-VN',
    ITEMS_PER_PAGE: 20
};

// API Endpoints
const ENDPOINTS = {
    NOW_PLAYING: 'movie/now_playing',
    POPULAR: 'movie/popular',
    TOP_RATED: 'movie/top_rated',
    UPCOMING: 'movie/upcoming',
    GENRES: 'genre/movie/list',
    SEARCH: 'search/movie',
    DISCOVER: 'discover/movie'
};

// DOM Elements
const elements = {
    // Navigation
    nav: document.querySelector('.nav'),
    navMenu: document.querySelector('.nav-menu'),
    mobileMenuButton: document.querySelector('.mobile-menu-btn'),
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-button'),
    
    // Banner
    banner: document.querySelector('.banner'),
    movieTitle: document.getElementById('movie-title'),
    movieRating: document.getElementById('movie-rating'),
    movieYear: document.getElementById('movie-year'),
    movieDuration: document.getElementById('movie-duration'),
    movieOverview: document.getElementById('movie-overview'),
    watchNowBtn: document.getElementById('watch-now'),
    moreInfoBtn: document.getElementById('more-info'),
    randomMovieBtn: document.getElementById('random-movie'),
    moviePoster: document.getElementById('anh_phim'),
    bannerPlayButton: document.querySelector('.play-button'),
    
    // Movie Lists
    hotMoviesList: document.getElementById('ds_hot'),
    newMoviesList: document.getElementById('ds_moi'),
    
    // Loading States
    loadingHot: document.getElementById('loading-hot'),
    loadingNew: document.getElementById('loading-new'),
    
    // Back to Top Button
    backToTop: document.getElementById('back-to-top')
};

// State
let currentBannerMovie = null;
let genres = {};
let imdbIdCache = {};

async function fetchJson(url) {
    const response = await fetch(url);
    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message = (data && (data.status_message || data.message)) ? (data.status_message || data.message) : `HTTP ${response.status}`;
        throw new Error(message);
    }

    return data;
}

function showBannerError(message) {
    if (elements.movieTitle) elements.movieTitle.textContent = 'Không thể tải dữ liệu';
    if (elements.movieOverview) elements.movieOverview.textContent = message || 'Vui lòng kiểm tra mạng hoặc API key và thử lại.';
    if (elements.movieRating) elements.movieRating.textContent = 'N/A';
    if (elements.movieYear) elements.movieYear.textContent = 'N/A';
    if (elements.movieDuration) elements.movieDuration.textContent = '';
    if (elements.moviePoster) {
        elements.moviePoster.removeAttribute('src');
        elements.moviePoster.alt = 'Poster phim';
    }
}

async function getRandomPopularMovie() {
    const url = `${CONFIG.BASE_URL}${ENDPOINTS.POPULAR}?api_key=${CONFIG.API_KEY}&language=${CONFIG.LANGUAGE}&page=1`;
    const data = await fetchJson(url);

    const totalPages = Math.min(20, data.total_pages || 1);
    const randomPage = Math.floor(Math.random() * totalPages) + 1;

    const urlPage = `${CONFIG.BASE_URL}${ENDPOINTS.POPULAR}?api_key=${CONFIG.API_KEY}&language=${CONFIG.LANGUAGE}&page=${randomPage}`;
    const dataPage = await fetchJson(urlPage);

    if (!dataPage.results || dataPage.results.length === 0) return null;
    const movie = dataPage.results[Math.floor(Math.random() * dataPage.results.length)];
    return movie || null;
}

async function openImdbForMovie(tmdbMovieId) {
    if (!tmdbMovieId) return;

    try {
        if (imdbIdCache[tmdbMovieId]) {
            window.open(`https://www.imdb.com/title/${imdbIdCache[tmdbMovieId]}/`, '_blank', 'noopener,noreferrer');
            return;
        }

        const url = `${CONFIG.BASE_URL}movie/${tmdbMovieId}/external_ids?api_key=${CONFIG.API_KEY}`;
        const data = await fetchJson(url);

        if (data && data.imdb_id) {
            imdbIdCache[tmdbMovieId] = data.imdb_id;
            window.open(`https://www.imdb.com/title/${data.imdb_id}/`, '_blank', 'noopener,noreferrer');
        }
    } catch (error) {
        console.error('Error opening IMDb:', error);
    }
}

// Initialize the application
async function init() {
    try {
        // Load genres first
        await loadGenres();
        
        // Load initial data
        await Promise.all([
            loadBannerMovie(),
            loadHotMovies(),
            loadNewMovies()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        // Show the page content
        document.body.classList.add('loaded');
    } catch (error) {
        console.error('Error initializing application:', error);
        showBannerError('Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.');
    }
}

// Load movie genres
async function loadGenres() {
    try {
        const url = `${CONFIG.BASE_URL}${ENDPOINTS.GENRES}?api_key=${CONFIG.API_KEY}&language=${CONFIG.LANGUAGE}`;
        const data = await fetchJson(url);
        
        // Convert genres array to object for easier lookup
        if (data && Array.isArray(data.genres)) {
            data.genres.forEach(genre => {
                genres[genre.id] = genre.name;
            });
        }
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Load a random movie for the banner
async function loadBannerMovie() {
    try {
        const url = `${CONFIG.BASE_URL}${ENDPOINTS.POPULAR}?api_key=${CONFIG.API_KEY}&language=${CONFIG.LANGUAGE}`;
        const data = await fetchJson(url);

        if (data.results && data.results.length > 0) {
            // Get a random movie from the first page
            const randomIndex = Math.floor(Math.random() * Math.min(10, data.results.length));
            const movie = data.results[randomIndex];

            // Update the banner with the movie details
            updateBanner(movie);
        }
    } catch (error) {
        console.error('Error loading banner movie:', error);
        showBannerError(error?.message || 'Không thể tải banner phim. Vui lòng thử lại sau.');
    }
}

// Load popular movies
async function loadHotMovies() {
    try {
        showLoading(elements.loadingHot, true);
        
        const url = `${CONFIG.BASE_URL}${ENDPOINTS.POPULAR}?api_key=${CONFIG.API_KEY}&language=${CONFIG.LANGUAGE}&page=1`;
        const data = await fetchJson(url);
        
        if (data.results && data.results.length > 0) {
            renderMovieList(data.results, elements.hotMoviesList);
        } else {
            showError('Không có dữ liệu phim HOT', elements.hotMoviesList);
        }
    } catch (error) {
        console.error('Error loading hot movies:', error);
        showError(error?.message || 'Không thể tải danh sách phim HOT', elements.hotMoviesList);
    } finally {
        showLoading(elements.loadingHot, false);
    }
}

// Load new movies
async function loadNewMovies() {
    try {
        showLoading(elements.loadingNew, true);
        
        // Get current date and date from 30 days ago
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const formattedDate = thirtyDaysAgo.toISOString().split('T')[0];

        // Fetch newly released movies from the last 30 days, sorted by release date
        const url = `${CONFIG.BASE_URL}${ENDPOINTS.DISCOVER}?api_key=${CONFIG.API_KEY}` +
                   `&language=${CONFIG.LANGUAGE}` +
                   `&sort_by=primary_release_date.desc` +
                   `&primary_release_date.gte=${formattedDate}` +
                   '&include_video=false' +
                   '&include_adult=false' +
                   '&page=1' +
                   '&vote_count.gte=50'; // Only include movies with some votes
        
        const data = await fetchJson(url);
        
        if (data.results && data.results.length > 0) {
            renderMovieList(data.results, elements.newMoviesList, true);
        } else {
            showError('Không có phim mới nào được tìm thấy', elements.newMoviesList);
        }
    } catch (error) {
        console.error('Error loading new movies:', error);
        showError(error?.message || 'Không thể tải danh sách phim mới', elements.newMoviesList);
    } finally {
        showLoading(elements.loadingNew, false);
    }
}

// Update the banner with movie details
function updateBanner(movie) {
    if (!movie) return;

    currentBannerMovie = movie;

    // Update banner background
    if (movie.backdrop_path) {
        elements.banner.style.backgroundImage = `url(${CONFIG.BACKDROP_URL}${movie.backdrop_path})`;
    }

    // Update movie details
    elements.movieTitle.textContent = movie.title || 'Không có tiêu đề';
    elements.movieRating.textContent = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    elements.movieYear.textContent = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    elements.movieOverview.textContent = movie.overview || 'Không có mô tả';

    // Update movie poster
    if (movie.poster_path) {
        elements.moviePoster.src = `${CONFIG.IMAGE_URL}${movie.poster_path}`;
        elements.moviePoster.alt = movie.title || 'Poster phim';
    }

    // Set up watch now button
    elements.watchNowBtn.onclick = () => {
        const target = document.getElementById('xem-phim-o-dau');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Set up more info button
    elements.moreInfoBtn.onclick = () => {
        // Open IMDb for the current banner movie
        openImdbForMovie(movie.id);
    };
}

// Render a list of movies
function renderMovieList(movies, container, isNewSection = false) {
    if (!container) return;

    container.innerHTML = '';

    // Create movie items
    movies.forEach(movie => {
        const movieEl = document.createElement('div');
        movieEl.className = 'movie';
        movieEl.dataset.id = movie.id;

        const posterSrc = movie.poster_path ? `${CONFIG.IMAGE_URL}${movie.poster_path}` : '/images/poster-placeholder.jpg';
        const title = movie.title || 'Không có tiêu đề';
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        const genreText = getGenreNames(movie.genre_ids).join(' • ');

        movieEl.innerHTML = `
            <div class="movie-poster">
                <img src="${posterSrc}" alt="${title}" loading="lazy">
                <div class="movie-overlay">
                    <button class="btn-play" type="button" aria-label="Xem phim">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
                <div class="rating">
                    <i class="fas fa-star"></i>
                    <span>${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                </div>
                ${isNewSection ? '<span class="badge-new">MỚI</span>' : ''}
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${title}</h3>
                <div class="movie-meta">
                    <span class="year">${year}</span>
                    <span class="genres">${genreText}</span>
                </div>
            </div>
        `;

        const playBtn = movieEl.querySelector('.btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await openImdbForMovie(movieEl.dataset.id);
            });
        }

        movieEl.addEventListener('click', (e) => {
            e.preventDefault();
            const movieId = movieEl.dataset.id;
            console.log('Movie clicked:', movieId);
        });

        container.appendChild(movieEl);
    });
}
// Get genre names from genre IDs
function getGenreNames(genreIds) {
    if (!genreIds || !Array.isArray(genreIds)) return [];
    return genreIds
        .map(id => genres[id])
        .filter(Boolean)
        .slice(0, 2); // Limit to 2 genres for display
}

// Show/hide loading state
function showLoading(element, isLoading) {
    if (!element) return;
    if (isLoading) {
        element.style.display = 'flex';
        element.style.justifyContent = 'center';
        element.style.alignItems = 'center';
        element.style.padding = '2rem';
    } else {
        element.style.display = 'none';
    }
}

// Show error message
function showError(message, container) {
    if (!container) {
        showBannerError(message);
        return;
    }
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
            <button class="btn btn-retry">Thử lại</button>
        </div>
    `;
    
    // Add retry button click handler
    const retryBtn = container.querySelector('.btn-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            if (container === elements.hotMoviesList) {
                loadHotMovies();
            } else if (container === elements.newMoviesList) {
                loadNewMovies();
            }
        });
    }
}

// Handle search
async function handleSearch() {
    const query = elements.searchInput.value.trim();
    if (!query) return;

    try {
        const url = `${CONFIG.BASE_URL}${ENDPOINTS.SEARCH}?api_key=${CONFIG.API_KEY}&language=${CONFIG.LANGUAGE}&query=${encodeURIComponent(query)}`;
        const data = await fetchJson(url);
        
        if (data.results && data.results.length > 0) {
            // Clear current movies
            elements.hotMoviesList.innerHTML = '';
            // Display search results
            renderMovieList(data.results, elements.hotMoviesList);
            // Scroll to results
            document.getElementById('phim-hot').scrollIntoView({ behavior: 'smooth' });
        } else {
            showError('Không tìm thấy phim phù hợp', elements.hotMoviesList);
        }
    } catch (error) {
        console.error('Search error:', error);
        showError(error?.message || 'Đã có lỗi xảy ra khi tìm kiếm', elements.hotMoviesList);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu toggle (nav-menu may be removed)
    if (elements.mobileMenuButton && elements.navMenu) {
        elements.mobileMenuButton.addEventListener('click', () => {
            elements.navMenu.classList.toggle('active');
            elements.mobileMenuButton.innerHTML = elements.navMenu.classList.contains('active') ?
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.nav.contains(e.target) && !e.target.closest('.nav-menu')) {
                elements.navMenu.classList.remove('active');
                elements.mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Close mobile menu when a nav link is clicked
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                elements.navMenu.classList.remove('active');
                elements.mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }

    // Search functionality (search-button may not exist in HTML)
    if (elements.searchButton) {
        elements.searchButton.addEventListener('click', handleSearch);
    }
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // Random movie button
    if (elements.randomMovieBtn) {
        elements.randomMovieBtn.addEventListener('click', async () => {
            const original = elements.randomMovieBtn.innerHTML;
            elements.randomMovieBtn.disabled = true;
            elements.randomMovieBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chọn...';

            try {
                const randomMovie = await getRandomPopularMovie();
                if (randomMovie) {
                    updateBanner(randomMovie);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) {
                console.error('Error getting random movie:', error);
                showBannerError(error?.message || 'Không thể chọn phim ngẫu nhiên.');
            } finally {
                elements.randomMovieBtn.disabled = false;
                elements.randomMovieBtn.innerHTML = original;
            }
        });
    }

    // Banner play button
    if (elements.bannerPlayButton) {
        elements.bannerPlayButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentBannerMovie || !currentBannerMovie.id) return;
            await openImdbForMovie(currentBannerMovie.id);
        });
    }

    // Back to top button
    if (elements.backToTop) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                elements.backToTop.classList.add('show');
            } else {
                elements.backToTop.classList.remove('show');
            }
        });
        
        elements.backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Navbar scroll effect
    if (elements.nav) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll <= 0) {
                elements.nav.classList.remove('scrolled');
                return;
            }
            
            if (currentScroll > lastScroll && currentScroll > 100) {
                // Scrolling down
                elements.nav.classList.add('scrolled');
            } else if (currentScroll < lastScroll - 5) {
                // Scrolling up
                elements.nav.classList.add('scrolled');
            }
            
            lastScroll = currentScroll;
        });
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
