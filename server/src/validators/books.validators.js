'use strict';

const Joi = require('joi');
const meta = require('../constants/bookMetadata');

const title = Joi.string().trim().min(1).max(70);
const synopsis = Joi.string().trim().min(1).max(5000);
const synopsisOptional = Joi.string().trim().max(5000).allow('', null);
const category = Joi.string().trim().max(80).allow('', null);
const language = Joi.string().trim().max(20);
const status = Joi.string().valid('draft', 'published', 'archived');
const bookType = Joi.string().valid(...meta.BOOK_TYPES);
const leadingGender = Joi.string().valid(...meta.LEADING_GENDERS);
const genre = Joi.string().valid(...meta.GENRE_SLUGS).allow(null);
const abbreviation = Joi.string().trim().max(15).allow('', null);
const bookLength = Joi.string().valid(...meta.BOOK_LENGTHS).allow(null);
const warningNotice = Joi.string().valid(...meta.WARNING_NOTICES).allow(null);

const homeBrowseTag = Joi.string().valid(
  'new_arrivals',
  'cheering_reads',
  'editors_choice',
  'ranking',
  'potential_starlet',
  'rising_fictions',
  'highly_rated',
);

const categoryId = Joi.number().integer().positive().allow(null);
const languageId = Joi.number().integer().positive().allow(null);
const contentTagIds = Joi.array().items(Joi.number().integer().positive()).max(32);

module.exports = {
  list: {
    query: Joi.object({
      q: Joi.string().trim().max(120).allow('', null),
      author: Joi.number().integer().positive(),
      category: Joi.string().trim().max(80),
      status: Joi.string().valid('draft', 'published', 'archived'),
      tag: homeBrowseTag,
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(60).default(12),
    }),
  },
  bySlug: {
    params: Joi.object({ slug: Joi.string().min(1).max(220).required() }),
  },
  create: {
    body: Joi.object({
      title: title.required(),
      synopsis: synopsis.required(),
      bookType: bookType.default('novel'),
      leadingGender: leadingGender.default('male'),
      genre: genre.required(),
      abbreviation,
      bookLength: bookLength.required(),
      warningNotice: warningNotice.required(),
      category,
      language: language.default('en'),
      categoryId,
      languageId: languageId.required(),
      contentTagIds,
      coverUrl: Joi.string().uri().max(500).allow('', null),
      status: status.default('draft'),
    }),
  },
  update: {
    body: Joi.object({
      title,
      synopsis: synopsisOptional,
      bookType,
      leadingGender,
      genre,
      abbreviation,
      bookLength,
      warningNotice,
      category,
      language,
      categoryId,
      languageId,
      contentTagIds,
      coverUrl: Joi.string().uri().max(500).allow('', null),
      status,
    }).min(1),
  },
};
