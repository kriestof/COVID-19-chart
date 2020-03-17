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

function Chart(confirmedData, svg) {
  const MARGIN = {x: 60, y: 10}
  const WIDTH = 800
  const HEIGHT = 600

  let parent = this
  this.allCountryNames = [...new Set(confirmedData.map((d) => d["Country/Region"]))]
  this.countries = []
  this.countryColors = new Set()

  svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "white")
  y = d3.scaleLog().domain([0.9,100000]).clamp(true).range([HEIGHT, 0])
  svg.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(10).tickFormat(
    function (d) {
      return (Math.round(Math.log10(d)) - Math.log10(d)) &&
        (Math.round(Math.log10(d/2)) - Math.log10(d/2))  ? '':d3.format(",.0f")(d) ;
    }

  )).attr("transform", `translate(${MARGIN.x}, ${MARGIN.y})`)

  dataCols = confirmedData.columns.slice(4, confirmedData.columns.length)
  x = d3.scaleTime().domain([new Date(dataCols[0]), new Date(dataCols[dataCols.length-1])]).range([ 0, WIDTH])
  svg.append("g").attr("class", "grid").attr("transform", `translate(${MARGIN.x}, ${HEIGHT+MARGIN.y})`).call(d3.axisBottom(x).ticks(dataCols.length).tickFormat(d3.timeFormat("%Y-%m-%d")))
    .selectAll("text").attr("transform", "rotate(-65)").attr("dx", "-.8em").attr("dy", ".15em").style("text-anchor", "end")

  svg.append("g").attr("class", "grid")
  d3.select("#download-chart").on("click", () => this.downloadChart())

  d3.select("#chart #search-country").on("keyup", function() {
    if(this.value.length > 2) {
      let selectedCountries = new Set(parent.countries.map((x) => x.name))
      let resCountry = parent._matchCountry(this.value).filter((countryName) => !selectedCountries.has(countryName))

      d3.select("#chart #result ul").selectAll("li").data(resCountry).
        join("li").text((d) => d)

        d3.selectAll("#chart #result ul li").on("click", function() {
          parent.drawChart(d3.select(this).text())
          d3.select("#chart #search-country").node().value = ""
          d3.select("#chart #result ul").selectAll("li").remove()
        })
    }
    else
      d3.select("#chart #result ul").selectAll("li").remove()
  })

  this.drawChart = function(countryName) {
    if (this.countries.length >= 10) return undefined
    if (this.countries.filter((x) => x.name == countryName).length) return undefined

    dates = confirmedData.columns.slice(4, confirmedData.columns.length)
    tsData = confirmedData.filter((d) => d["Country/Region"] == countryName)
    groupedTsData = dataCols.map(function(date) {
   return d3.nest()
     .key((d) => d["Country/Region"])
     .rollup((v) => d3.sum(v, (d) => parseFloat(d[date])))
     .object(tsData)[countryName]
 })

    diffGroupedTsData = [undefined]
    for (let i = 0; i < groupedTsData.length-1; i+=1) {
      let dif = groupedTsData[i+1] - groupedTsData[i]
      diffGroupedTsData.push(dif > 0 ? dif:0)
    }

    chartArray = []

    for (i = 0; i < groupedTsData.length; i+=1)
      chartArray.push({time: new Date(dates[i]), valueAll: groupedTsData[i], valueNew: diffGroupedTsData[i]})

    this.countries.push({name: countryName, data: chartArray, color: this._getColor()})

    this.drawLinesChart()
    this._drawLegendChart()
    if (this.countries.length == 10) d3.select("#chart #search-country").attr("disabled", true)
  }

  this.drawLinesChart = function() {
    chartSvg.selectAll('g.country').remove()

    let country = chartSvg.selectAll("g.country")
        .data(this.countries).enter().append("g").attr("class", "country")

    country.append("path")
       .attr("fill", "none")
       .attr("stroke", (d) => d.color)
       .attr("stroke-width", 1.5)
       .attr("d", (d) => d3.line()
         .x((d) => x(d.time)+MARGIN.x)
         .y((d) => y(this._getChartValue(d))+MARGIN.y)(d.data.filter((x) => this._getChartValue(x) !== undefined))
       )

    country
      .selectAll("circle")
      .data((d) => d.data.filter((x) => this._getChartValue(x) !== undefined))
      .enter().append("circle")
      .attr("fill", function(d) { return d3.select(this.parentNode).datum().color})
      .attr("cx", (d) => x(d.time)+MARGIN.x)
      .attr("cy", (d) => y(this._getChartValue(d))+MARGIN.y)
      .attr("r", 5)
      .attr("stroke-width", "2px")
      .on("mouseover", function() {
        d3.select(this).attr("stroke", d3.select(this).attr("fill"))
        d3.select(this).attr("fill", "white")
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", d3.select(this).attr("stroke"))
        d3.select(this).attr("stroke", null)
      })
      .append("title").text(function (d) {
        let countryName = d3.select(this.parentNode.parentNode).datum().name
        return `country: ${countryName}\n value: ${parent._getChartValue(d)} \n date: ${d3.timeFormat("%Y-%m-%d")(d.time)}`
      })
  }

  this._getChartValue = function(d) {
    return mode == "all" ? d.valueAll:d.valueNew
  }

  this._drawLegendChart = function() {
    legend = chartSvg.selectAll('g.legendEntry')
        .data(this.countries)
        .enter().append("g")
        .attr('class', 'legendEntry').attr("transform", "translate(60,0)")

    legend
        .append('rect')
        .attr("x", 20)
        .attr("y", (d, i) => i * 25 + 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", (d) => d.color)

     legend
         .append('text')
         .attr("x", 40)
         .attr("y", (d, i) => i * 25 + 20)
         .attr("dy", "0.8em")
         .text("[x]")
         .style("font-family", "sans-serif")
         .style("font-size", "12px")
         .style("fill", "red")
         .style("cursor", "pointer")
         .attr("class", "remove-label")
         .on("click", (d) => this.removeFromChart(d))

     legend
         .append('text')
         .attr("x", 60)
         .attr("y", (d, i) => i * 25 + 20)
         .attr("dy", "0.8em")
         .text((d) => d.name)
         .style("font-family", "sans-serif")
         .style("font-size", "12px")
         .attr("class", "text-label")
  }

  this.removeFromChart = function(removedCountry) {
    this.countries = this.countries.filter((el) => el.name != removedCountry.name)
    chartSvg.selectAll('g.legendEntry').remove()
    this._drawLegendChart()

    this.drawLinesChart()

    if (this.countries.length < 10) d3.select("#chart #search-country").attr("disabled", null)
    this.countryColors.delete(removedCountry.color)
  }

  this._getColor = function() {
    i = 0
    while (this.countryColors.has(d3.schemeCategory10[i])) i +=1

    this.countryColors.add(d3.schemeCategory10[i])
    return d3.schemeCategory10[i]
  }

  this._matchCountry = function(input) {
    let reg = new RegExp(input.split('').join('\\w*').replace(/\W/, ""), 'i');

    return this.allCountryNames.filter(function(countryName) {
      if (countryName.match(reg)) {
        return countryName;
      }
    }).sort()
  }

  this.downloadChart = function(e) {
    console.log("Aaa")
    console.log(this)
    d3.event.preventDefault()
    const MARGIN = {x: 60, y: 10}
    const WIDTH = 800
    const HEIGHT = 600

    downloadSvg = d3.select(chartSvg.node().cloneNode(true))
    downloadSvg.attr("width", chartSvg.node().width.baseVal.value)
    downloadSvg.attr("height",chartSvg.node().height.baseVal.value)

    downloadSvg.selectAll(".remove-label").remove()
    downloadSvg.selectAll(".text-label").attr("x", 40)

    downloadSvg
      .append("text")
      .text("source: covid19chart.info")
      .attr("y", downloadSvg.attr("height")-5).attr("x", MARGIN.x)
      .attr("fill", "#595959")
      .style("font-family", "sans-serif")
      .style("font-size", "12px")

    let svgString = new XMLSerializer().serializeToString(downloadSvg.node())

    let canvas = document.createElement("canvas");
    canvas.width=downloadSvg.attr("width"); canvas.height=downloadSvg.attr("height")

    let ctx = canvas.getContext("2d");
    let img = new Image();
    let svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
    let url = URL.createObjectURL(svg);

    img.onload = function() {
      ctx.drawImage(img, 0, 0);
      let png = canvas.toDataURL("image/png");
      let ref = document.createElement("a")
      ref.href = png
      ref.download = "COVID19-chart.png"
      ref.click()
      URL.revokeObjectURL(png);
    };
    img.src = url;
  }

}
