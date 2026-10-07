/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as botLinks from "../botLinks.js";
import type * as bots_commands from "../bots/commands.js";
import type * as bots_delivery from "../bots/delivery.js";
import type * as bots_formatters from "../bots/formatters.js";
import type * as bots_processor from "../bots/processor.js";
import type * as bots_queries from "../bots/queries.js";
import type * as bots_queryDelivery from "../bots/queryDelivery.js";
import type * as bots_telegram from "../bots/telegram.js";
import type * as bots_types from "../bots/types.js";
import type * as bots_webhooks from "../bots/webhooks.js";
import type * as bots_whatsapp from "../bots/whatsapp.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as notifications from "../notifications.js";
import type * as owners from "../owners.js";
import type * as payments from "../payments.js";
import type * as properties from "../properties.js";
import type * as propertyPhotos from "../propertyPhotos.js";
import type * as propertyFacilities from "../propertyFacilities.js";
import type * as publicRegistration from "../publicRegistration.js";
import type * as rentCharges from "../rentCharges.js";
import type * as rentals from "../rentals.js";
import type * as roomMedia from "../roomMedia.js";
import type * as rooms from "../rooms.js";
import type * as tenants from "../tenants.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bookings: typeof bookings;
  botLinks: typeof botLinks;
  "bots/commands": typeof bots_commands;
  "bots/delivery": typeof bots_delivery;
  "bots/formatters": typeof bots_formatters;
  "bots/processor": typeof bots_processor;
  "bots/queries": typeof bots_queries;
  "bots/queryDelivery": typeof bots_queryDelivery;
  "bots/telegram": typeof bots_telegram;
  "bots/types": typeof bots_types;
  "bots/webhooks": typeof bots_webhooks;
  "bots/whatsapp": typeof bots_whatsapp;
  crons: typeof crons;
  dashboard: typeof dashboard;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  notifications: typeof notifications;
  owners: typeof owners;
  payments: typeof payments;
  properties: typeof properties;
  propertyPhotos: typeof propertyPhotos;
  propertyFacilities: typeof propertyFacilities;
  publicRegistration: typeof publicRegistration;
  rentCharges: typeof rentCharges;
  rentals: typeof rentals;
  roomMedia: typeof roomMedia;
  rooms: typeof rooms;
  tenants: typeof tenants;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
