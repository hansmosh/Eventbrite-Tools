/**
 * This script can be used to get Eventbrite event tickets. You must run it from the Eventbrite event page.
 * Change OPTIONS below to configure script parameters
 *
 * The whole project can be found here: https://github.com/Dalimil/Eventbrite-Tools
 */

var OPTIONS = {
	startTime: "2018-12-01T09:59:55", // When should this script start checking for tickets (e.g. 5 seconds before official release time)
	ticketQuantities: [2, 2] // How many tickets you want to buy for each listed item
};

function checkLocation() {
	if (location.href.indexOf("eventbrite") == -1) {
		const errmsg = "You must go to the Eventbrite event page and run the script from there!";
		console.error(errmsg);
		throw new Error(errmsg);
	}
}

function post(path, params) {
	var form = document.createElement("form");
	form.setAttribute("method", "post");
	form.setAttribute("action", path);

	for (var key in params) {
		if (params.hasOwnProperty(key)) {
			var hiddenField = document.createElement("input");
			hiddenField.setAttribute("type", "hidden");
			hiddenField.setAttribute("name", key);
			hiddenField.setAttribute("value", params[key]);
			form.appendChild(hiddenField);
		}
	}
	document.body.appendChild(form);
	form.submit();
}

function findAll(needle, haystack) {
	const rx = new RegExp(needle, "g");
	const matches = [];
	while ((match = rx.exec(haystack)) !== null) {
		matches.push(match);
	}
	return matches;
}

function getTickets(data) {
	const ticketMatches = findAll("ticket_form_element_name\":\"([^\"]+)\"", data);
	return OPTIONS.ticketQuantities.map((quantity, index) => quantity ? [ticketMatches[index][1], quantity] : undefined).filter(ticket => ticket != undefined);
}

function isTicketAvailable(source) {
	// if the format changes and we get nulls, return true
	// mediator only applies to the current document status
	const mediator = require('mediatorjs');
	const ticketData = mediator && mediator.get('ticketOrderOptions');
	if (ticketData && ticketData.collection) {
		OPTIONS.ticketQuantities.forEach((quantity, index) => {
			const ticket = ticketData.collection[index];
			if (quantity && ticket && ((ticket.status_is_sold_out && !ticket.status_is_unavailable) || ticket.status_is_ended)) {
				throw new Error("SOLD OUT: " + ticket.status_is_sold_out + " or ENDED: " + ticket.status_is_ended);
			}
		});
	}

	const notOnSale = findAll("\"not_on_sale\":(true|false)+", source);
	const isNotOnSale = OPTIONS.ticketQuantities.some((quantity, index) => quantity && notOnSale[index] && notOnSale[index][1] == "true");
	if (isNotOnSale) { return false };

	return true;
}

var scheduler = initScheduler();
var running = true;

function run() {
	checkLocation();
	$.get(location.href, (data) => {
		const tickets = getTickets(data);
		if (tickets.length == 0 || !isTicketAvailable(data)) {
			const moment = require('moment');
			console.log(
				"Unsuccessful: " +
				moment(new Date()).format('MMMM Do YYYY, h:mm:ss a') +
				" " +
				(tickets.length == 0 ? "Unable to get ticket" : "Ticket is not available")
			);
			if (running) {
				setTimeout(run, 1000);
			}
			return;
		}
		const payload = tickets.reduce((acc, [ticket, quantity]) => ({
			...acc,
			'eid': $("form input[name=eid]").attr('value'),
			'has_javascript': 1,
			[ticket]: quantity
		}), {});
		console.log(payload);
		post("https://www.eventbrite.com/orderstart", payload);
	});
}

function stop() {
	if (!running) {
		return "Already stopped";
	}
	running = false;
	return "Stopped";
}

function initScheduler() {
	if (typeof scheduler !== 'undefined') {
		clearTimeout(scheduler); // when re-run
	}
	return null;
}

$(document).ready(function() {
	checkLocation();
	const diff = Date.parse(OPTIONS.startTime) - Date.now();
	const timeToStart = Math.max(0, diff || 0);
	console.log(`Scheduled start in: ` +
		`${Math.floor(timeToStart / (1000 * 60))}m ` +
		`${Math.floor(timeToStart / 1000)%60}s`);

	scheduler = setTimeout(run, timeToStart);
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
