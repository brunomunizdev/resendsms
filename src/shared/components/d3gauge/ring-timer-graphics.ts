import * as d3 from 'd3';

import { RingTimerEngine } from './ring-timer-engine';

export class RingTimerGraphics {

  ringTimerEngine: RingTimerEngine;
  micTimer: any;
  micTimerGroup: any;
  micTimerDimAttr: any;
  config: any;
  isTimerInitialised: boolean = false;

  // d3 scales
  gaugeCircleX: any;
  gaugeCircleY: any;
  pulsingScale: any;

  // rreferência ao objeto timeData
  timeData: any;
  warmUpRemaining: number;

  constructor(ringTimerEngine: RingTimerEngine) {
    this.loadDefaultConfig();
    this.ringTimerEngine = ringTimerEngine;
    this.ringTimerEngine.timeDataSubject.subscribe(timeData => { this.updateTimeData(); });
    this.ringTimerEngine.phaseSubject.subscribe(timeData => { this.updatePhase(); });
    this.ringTimerEngine.initSubject.subscribe(timeData => { this.updateInit(); });
    this.ringTimerEngine.pausePingSubject.subscribe(timeData => { this.updateTimeData(); });
  }

  private loadDefaultConfig(): void {

    let config = {
      // configuração de layout / cores
      ringSpacing: 1, // px espaçamento entre os anéis do contador s e ms
      rSize: 17, // px tamanho total do micTimer interno ex a espessura do arco
      rThickness: 10, // px espessura de micTimer
      msShrinkFactor: 0.75, // espessura do círculo milissegundo. 0 é tamanho completo, 1 é espessura zero
      scaleFactor: 1.00,  // multiplicador para dimensionar todo o medidor.
      counterTextSize: 1.5, // A altura relativa do texto a ser exibido no círculo. 1 = 50%
      unitTextSize: 0.6, // A altura relativa do texto a ser exibido no círculo. 1 = 50%

      colors: {
        // first: 'rgba' + d3.rgb("#dde0e4").toString().slice(3, - 1) +  ', 0.2)', // lightslategrey
        //ready: 'rgba' + d3.rgb("#dde0e4;").toString().slice(3, - 1) +  ', 0.7)', //gold
        countdown: 'rgba' + d3.rgb("#9E1DA0").toString().slice(3, - 1) + ', 0.7)', // seagreen
        // warmup: "orange", // orange
        //warning: 'rgba' + d3.rgb("#dde0e4").toString().slice(3, - 1) +  ', 0.7)', // red
        //paused: 'rgba' + d3.rgb("#dde0e4;").toString().slice(3, - 1) +  ', 0.7)', //gold
        //finished: 'rgba' + d3.rgb("#dde0e4;").toString().slice(3, - 1) +  ', 0.8)', // gold
        //stopped: 'rgba' + d3.rgb("#dde0e4;;").toString().slice(3, - 1) +  ', 0.7)', // gold
        //text:  'rgba' + d3.rgb("#dde0e4;").toString().slice(3, - 1) +  ', 1.0)', // black
      },

      warmUpFlashTime: 1000, // timer de mudar o alfa da banda de aquecimento.
      unitsToDisplay: 'SEGUNDOS',
      ringCount: 5, // número de micTimers no componente
      elementId: 'ring-timer-gauge',

      calc: { // essas variáveis ​​são colocadas aqui, pois a estrutura de configuração é um local conveniente para armazenar, passá-las. Mas não, na verdade, variáveis ​​de configuração.
        radius: 0,
        counterTextPixels: 0,
        unitTextPixels: 0,
        // conjunto de variáveis ​​via setters públicos
        phase: 'codigo enviado', // 'warmup', 'countdown', 'warning', 'finished', 'paused', 'stopped'
        warmUpMessage: 'codigo enviado...',
        alphas: {
          paused: 0.3, // variável para permitir o efeito pulsante durante uma fase de pausa.
          warmup: 0.3, // variável para permitir o efeito pulsante durante a fase de aquecimento.
        }
      }
    };
    this.config = config;
  }

  private updateTimeData(): void {
    this.timeData = this.ringTimerEngine.getTimeData();
    if (!this.isTimerInitialised)
      return;
    if (this.isWarmUpPhase()) {
      this.determineWarmUpAlpha();
      this.determineWarmUpMessage();
    }
    //if (this.isPausedPhase())
    //this.determinePauseAlpha();

    this.drawD3Timer();
  }

  private updatePhase(): void {
    this.setPhase(this.ringTimerEngine.getPhase());
  }

  private updateInit(): void {
    this.setRingCount(this.ringTimerEngine.getTimeUnitCount() + 1);
    this.initDimensions(); // extraído do final de readyTimer
    this.initD3Timer();
    this.drawD3Timer();
  }

  private setColorAlpha(colorKey: string, alpha: number) {
    this.config.calc.alphas[colorKey] = alpha;
  }

  private setWarmupMessage(warmUpMessage): void {
    this.config.calc.warmUpMessage = warmUpMessage;
  }

  private setPhase(phase: string): void {
    this.config.calc.phase = phase;
  }

  private isWarmUpPhase(): boolean {
    return (this.config.calc.phase === "warmup");
  }

  private isPausedPhase(): boolean {
    return (this.config.calc.phase === "paused");
  }

  private setRingCount(ringCount: number) {
    this.config.ringCount = ringCount;
  }

  private determineWarmUpAlpha(): void {
    this.warmUpRemaining = this.ringTimerEngine.getWarmUpRemaining();
    let alpha = ((this.warmUpRemaining) / this.config.warmUpFlashTime) % 1;
    this.setColorAlpha("warmup", alpha);
  }

  // o texto warmUp - dá ao usuário uma abundância de temporizador de aviso começará em breve.
  private determineWarmUpMessage(): void {
    let warmUpMessage: string = '';
    if (this.warmUpRemaining >= 2000) warmUpMessage = Math.ceil((this.warmUpRemaining / 1000)) + '';
    if (this.warmUpRemaining < 2000) warmUpMessage = "código enviado";
    this.setWarmupMessage(warmUpMessage);
  }

  // determinar as dimensões gerais do controle e seus principais componentes
  public initDimensions(): void {
    this.applySizeScaleFactor();
    this.setMicTimerDimAttr();
    // Raio externo do calibre da campainha
    this.config.calc.radius = this.micTimerDimAttr.w / 2;
    // Calcular o tamanho da fonte em pixels
    this.config.calc.counterTextPixels = (this.config.counterTextSize * this.config.rSize / 2);
    this.config.calc.unitTextPixels = (this.config.unitTextSize * this.config.rSize / 2);
  }

  private applySizeScaleFactor(): void {
    this.config.ringSpacing = this.config.ringSpacing * this.config.scaleFactor;
    this.config.rSize = this.config.rSize * this.config.scaleFactor;
    this.config.rThickness = this.config.rThickness * this.config.scaleFactor;
  }

  private setMicTimerDimAttr(): void {
    this.micTimerDimAttr = {
      w: (this.config.rSize + (this.config.rThickness * this.config.ringCount) + ((this.config.ringCount - 1) * this.config.ringSpacing)) * 2 + 6, // the +6 adds some margins.
      h: (this.config.rSize + (this.config.rThickness * this.config.ringCount) + ((this.config.ringCount - 1) * this.config.ringSpacing)) * 2 + 6,
      margin: { top: 2, bottom: 2, right: 2, left: 2 }
    };
  }

  // **
  // ** D3 UI routines
  // **

  // **Inicializar objetos D3
  public initD3Timer(): void {
    console.log('in initD3Timer');
    this.getTimerSVG();
    this.sizeTimerSVG();
    this.clearTimerSVG();
    this.createTimerGroup();
    this.addDropShadow();
    this.initD3Scales();
    this.isTimerInitialised = true;
  }

  private getTimerSVG(): void {
    this.micTimer = d3.select("#" + this.config.elementId);
  }

  private sizeTimerSVG(): void {
    this.micTimer
      // ajustar o tamanho do svg para caber todos os contadores individuais
      .style("width", this.micTimerDimAttr.w + this.micTimerDimAttr.margin.left + this.micTimerDimAttr.margin.right)
      // ajustar o tamanho do svg para caber todos os contadores individuais
      .style("height", this.micTimerDimAttr.h + this.micTimerDimAttr.margin.top + this.micTimerDimAttr.margin.bottom);
  }

  private clearTimerSVG(): void {
    this.micTimer.selectAll("*").remove();
  }

  private createTimerGroup(): void {
    this.micTimerGroup = this.micTimer.append("g")
      .attr("transform", "translate(" + this.micTimerDimAttr.margin.left + "," + this.micTimerDimAttr.margin.top + ")");
  }


  private addDropShadow(): void {
    // ** coisas de filtro
    // ** Para o filtro de sombreamento ..
    let defs = this.micTimerGroup.append('defs');

    let filter = defs.append('filter')
      .attr('id', 'dropshadow')

    filter.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 2) // 2
      .attr('result', 'blur');

    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('dx', 1) // 2
      .attr('dy', 1) // 3
      .attr('result', 'offsetBlur');

    let feMerge = filter.append('feMerge');

    feMerge.append('feMergeNode')
      .attr('in", "offsetBlur')
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');
    // end filter stuff
  }

  private initD3Scales(): void {
    // Escalas para desenhar os anéis do temporizador.
    this.gaugeCircleX = d3.scaleLinear()
    //  .range([0, 2 * Math.PI]).domain([0, 1])

    this.gaugeCircleY = d3.scaleLinear()
      // .range([0, this.config.calc.radius])
      .domain([0, this.config.calc.radius]);


    // defina o intervalo min para 0,3, pois não deseja que o texto, arc seja totalmente transparente.
    // domínio oscila entre 0 e 1,0
    this.pulsingScale = d3.scalePow().exponent(0.8)
      .range([0.3, 1])
      .domain([0, 1]);
  }

  // ** Desenhar e redesenhar objetos D3
  public drawD3Timer(): void {
    this.drawFirstCircle();  // a camada de base
    this.drawSecondCircle(); // a camada móvel
    this.drawCounterText();
    this.drawTimeUnitsText();
  }

  // **
  // ** Desenhe os círculos da base (primeiros círculos).
  // **
  private drawFirstCircle(): void {

    let firstCircle = this.micTimerGroup.selectAll(".firstCircle")
      .data(this.timeData, <any>function (d, i) { return d.idx; });

    firstCircle.enter()
      .append("path")
      .attr("class", "firstCircle")
      .attr("d", this.circleArcFunction("firstCircle"))
      .attr("filter", "url(#dropshadow)")
      .attr("transform", "translate(" + this.config.calc.radius + "," + this.config.calc.radius + ")")
      .style("fill", this.config.colors.first)
      .merge(firstCircle);

    firstCircle.exit().remove();
  }

  // **
  // ** Desenhe os círculos do temporizador (segundos círculos).
  // **
  private drawSecondCircle(): void {
    let self = this;

    let secondCircle = this.micTimerGroup.selectAll(".secondCircle")
      .data(this.timeData, <any>function (d, i) { return d.idx; });

    secondCircle.enter()
      .append("path")
      .attr("class", "secondCircle")
      .attr("transform", "translate(" + this.config.calc.radius + "," + this.config.calc.radius + ")")
      .merge(secondCircle)
      .style("fill", <any>function (d, i) {
        return self.getCircleColor(self.config.calc.phase);
      })
      .attr("d", this.circleArcFunction("secondCircle"));

    secondCircle.exit().remove();
  }

  // ** 
  // ** Desenhar texto do contador
  // **
  private drawCounterText(): void {
    let self = this;

    let singleDecValueIdx: number = this.getCounterDecValueIdx();
    let textShift = this.config.calc.counterTextPixels * 0.15;

    let ct = this.micTimerGroup.selectAll(".counterText")
      .data([this.timeData[singleDecValueIdx]]);

    ct.enter()
      .append("text")
      .attr("class", "counterText")
      .attr("text-anchor", "middle")
      .attr("font-size", this.config.calc.counterTextPixels + "px")
      .attr("transform", "translate(" + this.config.calc.radius + "," + (this.config.calc.radius + textShift) + ")")
      .merge(ct)
      .style("fill", <any>function (d, i) { return self.getTextColor(self.config.calc.phase); })
      .text(<any>function (d) { return self.getCounterText(d); });

    ct.exit().remove();
  }

  // ** 
  // ** Desenhar o texto das unidades de tempo
  // **
  private drawTimeUnitsText(): void {
    let singleDecValueIdx: number = this.getCounterDecValueIdx();
    let shiftTimeUnitsText = this.config.calc.counterTextPixels * 0.25;

    let timeUnitsText = this.micTimerGroup.selectAll(".timeUnitsText")
      .data([this.timeData[singleDecValueIdx]]);

    timeUnitsText.enter()
      .append("text")
      .text(<any>function (d) { return d.t; })
      .attr("class", "timeUnitsText")
      .attr("text-anchor", "middle")
      .attr("font-size", this.config.calc.unitTextPixels + "px")
      .style("fill", this.config.colors.text)
      .attr("transform", "translate(" + this.config.calc.radius + "," + (this.config.calc.radius + this.config.calc.unitTextPixels + shiftTimeUnitsText) + ")");

    timeUnitsText.exit().remove();
  }

  // **
  // **Funções para desenhar arcos
  // **
  private circleArcFunction(circleName: string): any {
    let self = this;
    let secondCircleArc = d3.arc()
      .startAngle(this.gaugeCircleX(0))
      .endAngle(<any>function (d) { return self.getEndAngle(d, circleName); })
      .innerRadius(<any>function (d) { return self.getInnerRadius(d); })
      .outerRadius(<any>function (d) { return self.getOuterRadius(d); });
    return secondCircleArc;
  }

  private getEndAngle(d: any, circleName: string) {
    if (circleName === "firstCircle")
      return this.gaugeCircleX(1);
    return this.gaugeCircleX(d.baseZeroToOne);
  }

  private getInnerRadius(d): number {
    if (d.idx === 0) // o anel de milissegundos é mais fino que os anéis externos.
      return this.gaugeCircleY((this.config.rSize + this.config.rThickness * this.config.msShrinkFactor));
    return this.gaugeCircleY((this.config.rSize + (this.config.rThickness * d.idx) + (d.idx * this.config.ringSpacing)));
  }

  private getOuterRadius(d): number {
    return this.gaugeCircleY((this.config.rSize + (this.config.rThickness * (d.idx + 1)) + (d.idx * this.config.ringSpacing)));
  }

  // **
  // ** Funções para obter cores de arco e texto
  // **
  private applyAlpha(key: string, itemColor: any): string {
    if (typeof this.config.calc.alphas[key] !== undefined) {
      itemColor = d3.rgb(itemColor);
      itemColor.opacity = this.pulsingScale(this.config.calc.alphas[key]);
    }
    return itemColor;
  }

  private getCircleColor(key: string): string {
    let itemColor = this.config.colors[key];
    return this.applyAlpha(key, itemColor);
  }

  private getTextColor(key: string): string {
    let itemColor = this.config.colors.text;
    return this.applyAlpha(key, itemColor);
  }

  // **
  // ** Funções para exibir o texto do contador
  // **
  private getCounterDecValueIdx(): number {
    let singleDecValueIdx: number = 0;
    for (let td of this.timeData) {
      if (td.t === this.config.unitsToDisplay) {
        singleDecValueIdx = td.idx;
        break;
      }
    };
    return singleDecValueIdx;
  }

  private getCounterText(d: any) {
    if (this.config.calc.phase === 'warmup') {
      return this.config.calc.warmUpMessage;
    } else {
      let retVal = (d.singleDecValue.toFixed(2) < 1.0) ? d.singleDecValue.toFixed(2) : d.singleDecValue.toFixed(1);
      return retVal;
    }
  }
}