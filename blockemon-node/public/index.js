var data = [
    {
        "block-height": "bootstrap-table",
        "block-time": "526",
        "block-relayedby": "122",
        "block-hash": "An extended",
    	"block-size": "test"
    }
]

$(function () {
	console.log(JSON.stringify(bc.blockchain));
    $('#blockchain-table').bootstrapTable({
        data: data
    });
});
