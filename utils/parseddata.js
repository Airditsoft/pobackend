const parseODataDate = (odataDate) => {
    const timestamp = odataDate.match(/\/Date\((\d+)\)\//);
    return timestamp ? new Date(parseInt(timestamp[1], 10)) : null;
  };


  const isTodayWithinRange = (fromDate, toDate) => {
    const today = new Date();
    const start = new Date(fromDate);
    const end = new Date(toDate);
  
    // Set the time component to 0 for all dates to ensure accurate comparison of dates only
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
  
    return today >= start && today <= end;
  };
  module.exports = {parseODataDate,isTodayWithinRange};