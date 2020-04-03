// Copyright 2020 Krzysztof Piwoński <piwonski.kris@gmail.com>
//
// This file is a part of COVID-19 chart.
//
// COVID-19 chart is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// COVID-19 chart is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

function worldMap(countryNames, dates, svg) {
  let projection = d3.geoRobinson()
  const REG_PROJECTION = {
    "world": {scale: projection.scale(), translate: projection.translate()},
    "europe": {scale: 700, translate: [300, 930]},
    "australia": {scale: 450, translate: [-600, 50]},
    "asia": {scale: 400, translate: [-100, 500]},
    "africa": {scale: 350, translate: [300, 260]},
    "samerica": {scale: 350, translate: [800, 140]},
    "namerica": {scale: 450, translate: [1200, 600]}
  }

    projection = projection
      .scale(REG_PROJECTION[region].scale)
      .translate(REG_PROJECTION[region].translate)

  let path = d3.geoPath().projection(projection)
  let scale = d3.scaleLog().base(4)
  svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "#4d4d4d")
  svg.append("g").attr("class", "country-paths")
  svg.append("rect").attr("width", "130px").attr("height", "250px").attr("fill", "#525252")


  world = undefined

  let countriesData = undefined
  let tooltip = undefined

  function initMap() {
    tooltip = d3.select("#map").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.select("#date").on("input", function() {
          displayMapForDate(dates[this.value])
        })

    d3.select("#map-outer a").on("click", downloadMapPng)

    return d3.json("https://unpkg.com/world-atlas@2.0.2/countries-50m.json").then((data) => world = data)
    .then(drawWorld)
  }

  function updateLegend(vals) {
    let legend = svg.selectAll('g.legendEntry')
        .data(["Not avaliable", 0].concat(vals))
    let legendEnter = legend.enter().append('g').attr('class', 'legendEntry');
    legend.exit().remove()

    legendEnter
       .append('rect')
       .attr("width", 15)
       .attr("height", 15)
       .attr("x", 20)
       .attr("y", (d, i) => i * 25 + 20)

     legendEnter
         .append('text')
         .attr("x", 40)
         .attr("y", (d, i) => i * 25 + 22)
         .attr("dy", "0.8em")
         .style("font-family", "sans-serif")
         .style("font-size", "12px")
         .style("fill", "white");

    svg.selectAll('g.legendEntry')
      .select("text").text((d,i) => d)

    svg.selectAll('g.legendEntry')
      .select("rect")
      .attr("fill", function(d) {
        if (d === "Not avaliable") return "#ababab"
        return d ? d3.interpolateYlOrRd(scale(d)):"white"
      })
  }

  function changeData(data) {
    countriesData = data

    let dateEl = d3.select("#date")
      .attr("max", dates.length-1)
    dateEl.node().value = dates.length-1

    maxVal =  math.max(data.toArray().map((arr) => arr.filter((x) => !Number.isNaN(x) && Number.isFinite(x))))
    minVal =  math.min(data.toArray().map((arr) => arr.filter((x) => !Number.isNaN(x) && Number.isFinite(x))))

    scale.domain([minVal+1, maxVal])
    updateLegend(math.range(1/7, 1.01, 1/7).toArray()
      .map((x) => parseFloat(scale.invert(x).toPrecision(2))))
    displayMapForDate(dates[dates.length-1])
  }

  function drawWorld() {
    svg.select(".country-paths").selectAll("path")
       .data(topojson.feature(world,world.objects.countries).features)
       .enter().append("path")
       .attr("d", path)
       .style("cursor", "pointer");
    svg.selectAll("path")
    .on("mouseover", function(d) {
      let val = 0
      if (Number.isNaN(d.properties.value) || !Number.isFinite(d.properties.value))
        val = "Not avaliable"
      else
        val = parseFloat(d.properties.value.toPrecision(7))

      d3.select(this).attr("stroke", "#004d76").attr("stroke-width", "3")
      tooltip
        .html(`country: ${d.properties.name} </br> value: ${val}`)
        .style("top", d3.mouse(this)[1] + "px")
        .style("left", d3.mouse(this)[0] + "px")
        .style("opacity", 0.9)
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke", "")
      tooltip.style("opacity", 0)
    })
    .on("click", function(d) {
        chart.drawChart(d.properties.name)
    })
  }

  function displayRegion(region) {
    projection.scale(REG_PROJECTION[region].scale).translate(REG_PROJECTION[region].translate)
    svg.selectAll("path").remove()
    drawWorld()
    displayMapForDate()
  }

  function displayMapForDate(date) {
    if (!date)
      date = d3.select("#selected-date").text()
    d3.select("#selected-date").text(date)

    let prevDay = new Date(date)
    prevDay.setDate(prevDay.getDate()-1)
    prevDay = d3.timeFormat("%-m/%-d/%y")(prevDay)

    svg.selectAll("path").
        attr("fill", function(d) {
          if (countryNames.indexOf(d.properties.name) == -1) return "#ababab"
          val = math.subset(countriesData, math.index(countryNames.indexOf(d.properties.name), dates.indexOf(date)))
          if (Number.isNaN(val) || !Number.isFinite(val)) return "#ababab"
          return val ? d3.interpolateYlOrRd(scale(val)):"white"
        }).
        each(function(d) {
          if (countryNames.indexOf(d.properties.name) != -1)
            d.properties.value = math.subset(countriesData, math.index(countryNames.indexOf(d.properties.name), dates.indexOf(date)))
        })
  }

  function downloadMapPng() {
    d3.event.preventDefault()

    downloadSvg = d3.select(mapSvg.node().cloneNode(true))
    downloadSvg.attr("width", mapSvg.node().width.baseVal.value)
    downloadSvg.attr("height",mapSvg.node().height.baseVal.value)

    downloadSvg.append("rect")
      .attr("y", downloadSvg.attr("height")-55)
      .attr("height", 55)
      .attr("width", d3.select("#formula").node().value.length*8+20)
      .attr("fill", "#525252")

    downloadSvg
      .append("text")
      .text("source: covid19chart.info")
      .attr("y", downloadSvg.attr("height")-7).attr("x", 5)
      .attr("fill", "white")
      .style("font-family", "sans-serif")
      .style("font-size", "12px")

      downloadSvg
        .append("text")
        .text(`date: ${d3.timeFormat("%d-%m-%Y")(new Date(d3.select("#selected-date").text()))}`)
        .attr("y", downloadSvg.attr("height")-21).attr("x", 5)
        .attr("fill", "white")
        .style("font-family", "sans-serif")
        .style("font-size", "12px")

      downloadSvg
        .append("text")
        .text("formula: " + d3.select("#formula").node().value)
        .attr("y", downloadSvg.attr("height")-37).attr("x", 5)
        .attr("fill", "white")
        .style("font-family", "sans-serif")
        .style("font-size", "12px")

    downloadPng(downloadSvg, "COVID19-map.png")
  }

  return {
    changeData: changeData,
    displayMapForDate: displayMapForDate,
    displayRegion: displayRegion,
    initMap: initMap,
    downloadMapPng: downloadMapPng
  }
}
