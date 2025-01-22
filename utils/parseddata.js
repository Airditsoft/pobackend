const parseODataDate = (odataDate) => {
    const timestamp = odataDate.match(/\/Date\((\d+)\)\//);
    return timestamp ? new Date(parseInt(timestamp[1], 10)) : null;
  };

  module.exports = {parseODataDate};