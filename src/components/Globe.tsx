import { onMount, onCleanup } from "solid-js";
import * as d3 from "d3";
import worldData from "../lib/world.json";

const GlobeComponent = () => {
  let mapContainer: HTMLDivElement | undefined;
  let tooltip: HTMLDivElement | undefined;

  const visitedCountries = [
    "Indonesia",
    "China",
    "Italy",
    "Singapore",
    "Malaysia",
    "France",
    "USA",
    "Thailand",
    "Australia",
  ];

  let timer: d3.Timer | undefined;
  let dragTimeout: NodeJS.Timeout | undefined;

  onMount(() => {
    if (!mapContainer || !tooltip) return;

    const width = mapContainer.clientWidth;
    const height = 500;
    const sensitivity = 75;

    let projection = d3
      .geoOrthographic()
      .scale(250)
      .center([0, 0])
      .rotate([0, -30])
      .translate([width / 2, height / 2]);

    const initialScale = projection.scale();
    let pathGenerator = d3.geoPath().projection(projection);

    let svg = d3
      .select(mapContainer)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("cursor", "grab");

    svg
      .append("circle")
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#999")
      .attr("stroke-width", "0.5")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", initialScale);

    let map = svg.append("g");

    let isInteracting = false;

    const countries = map
      .append("g")
      .attr("class", "countries")
      .selectAll("path")
      .data(worldData.features)
      .enter()
      .append("path")
      .attr("d", (d: any) => pathGenerator(d as any))
      .attr("fill", (d: any) =>
        visitedCountries.includes(d.properties.name) ? "#E63946" : "white"
      )
      .style("stroke", "#999")
      .style("stroke-width", 0.3)
      .style("opacity", 0.8)
      .style("transition", "fill 0.2s, opacity 0.2s")
      .on("mouseover", (event: any, d: any) => {
        if (!tooltip) return;
        tooltip.style.opacity = "1";
        tooltip.textContent = d.properties.name;
        d3.select(event.currentTarget)
          .style("opacity", "1")
          .style("fill", visitedCountries.includes(d.properties.name) ? "#FF4D5A" : "#e0e0e0");
      })
      .on("mousemove", (event: any) => {
        if (!tooltip) return;
        // Adjust tooltip position relative to the container
        const containerRect = mapContainer?.getBoundingClientRect();
        if (containerRect) {
            tooltip.style.left = `${event.clientX - containerRect.left + 15}px`;
            tooltip.style.top = `${event.clientY - containerRect.top + 15}px`;
        }
      })
      .on("mouseout", (event: any, d: any) => {
        if (!tooltip) return;
        tooltip.style.opacity = "0";
        d3.select(event.currentTarget)
          .style("opacity", "0.8")
          .style("fill", visitedCountries.includes(d.properties.name) ? "#E63946" : "white");
      });

    // Drag behavior
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on("start", (event) => {
        isInteracting = true;
        svg.style("cursor", "grabbing");
        if (dragTimeout) clearTimeout(dragTimeout);
        // Prevent event from bubbling to <a> tag during drag
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
      })
      .on("drag", (event) => {
        const rotate = projection.rotate();
        const k = sensitivity / projection.scale();
        projection.rotate([
          rotate[0] + event.dx * k,
          rotate[1] - event.dy * k
        ]);
        svg.selectAll("path").attr("d", (d: any) => pathGenerator(d as any));
        // Prevent event from bubbling to <a> tag during drag
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
      })
      .on("end", (event) => {
        svg.style("cursor", "grab");
        // Resume rotation after 3 seconds of inactivity
        dragTimeout = setTimeout(() => {
          isInteracting = false;
        }, 3000);
        // Prevent event from bubbling if it was a real drag
        if (event.sourceEvent && (Math.abs(event.x) > 2 || Math.abs(event.y) > 2)) {
            event.sourceEvent.stopPropagation();
        }
      });

    svg.call(drag as any);
    
    // Also stop propagation for other mouse events to be safe
    svg.on("mousedown", (event) => event.stopPropagation());
    svg.on("mouseup", (event) => {
        // We let mouseup bubble UNLESS it was a drag, 
        // but D3 drag end might have already handled it.
        // Actually, for a simple click to work through the <a> tag, 
        // we should probably NOT stop propagation on mouseup if it wasn't a drag.
    });

    timer = d3.timer(() => {
      if (isInteracting) return;
      const rotate = projection.rotate();
      const k = sensitivity / projection.scale();
      projection.rotate([rotate[0] - 0.5 * k, rotate[1]]);
      svg.selectAll("path").attr("d", (d: any) => pathGenerator(d as any));
    });
  });

  onCleanup(() => {
    if (timer) timer.stop();
    if (dragTimeout) clearTimeout(dragTimeout);
  });

  return (
    <div class="flex flex-col text-white justify-center items-center w-full h-full relative">
      <div 
        ref={tooltip} 
        class="absolute bg-black/90 text-white px-2 py-1 rounded text-xs pointer-events-none opacity-0 z-50 transition-opacity duration-200 border border-white/10"
      ></div>
      <div class="w-full h-full flex justify-center items-center" ref={mapContainer}></div>
    </div>
  );
};

export default GlobeComponent;
