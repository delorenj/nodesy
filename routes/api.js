
/*
 * GET etsy listings.
 */

exports.testListings = function(req, res){
	express.http.get(etsy_url + "/listings/active?" + querystring.stringify({api_key: etsy_key, limit: 10, offset: 0})
		, function(err, body, resp) {
			self.respond(200, JSON.stringify(body));
		});
};