import { Router } from 'express';
import { asyncHandler } from '../utils/http.js';
import { login, logout, refresh } from '../controllers/authController.js';
import { listListings, getListing, getSimilar } from '../controllers/listingsController.js';
import { listRentals, getRental } from '../controllers/rentalsController.js';
import { listProjects, getProject } from '../controllers/projectsController.js';
import { listFavourites, addFavourite, removeFavourite } from '../controllers/favouritesController.js';
import { getInsights } from '../controllers/insightsController.js';

const router = Router();

// auth
router.post('/auth/login', asyncHandler(login));
router.post('/auth/refresh', asyncHandler(refresh));
router.post('/auth/logout', asyncHandler(logout));

// listings
router.get('/listings', asyncHandler(listListings));
router.get('/listings/:id/similar', asyncHandler(getSimilar));
router.get('/listings/:id', asyncHandler(getListing));

// rentals
router.get('/rentals', asyncHandler(listRentals));
router.get('/rentals/:id', asyncHandler(getRental));

// projects
router.get('/projects', asyncHandler(listProjects));
router.get('/projects/:id', asyncHandler(getProject));

// favourites (per user, upstream /v1/saved)
router.get('/favourites', asyncHandler(listFavourites));
router.post('/favourites', asyncHandler(addFavourite));
router.delete('/favourites/:id', asyncHandler(removeFavourite));

// insights
router.get('/insights', asyncHandler(getInsights));

export default router;
