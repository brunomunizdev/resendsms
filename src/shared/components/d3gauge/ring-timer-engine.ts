import { Subject } from 'rxjs/Subject';

import * as d3 from 'd3'; // para a função de intervalo

import { TimerTimeData } from './ring-timer-config.interface';

export class RingTimerEngine {

  public timeDataSubject: Subject<any>;
  public phaseSubject: Subject<any>;
  public initSubject: Subject<any>;
  public pausePingSubject: Subject<any>;
  public finishedSubject: Subject<any>;

  private warmUpFor: number;
  private countdownFor: number;
  private warningFor: number;
  private countdownToTime: number;
  private countdownRemaining: number;
  private warmUpRemaining: number;

  private myD3Timer: any;
  private config: any;

  protected timeData: TimerTimeData[];

  initRingerTimeData() {

    const MILLISECS_IN_MILLISEC: number = 1;
    const MILLISECS_IN_SECOND: number = 1000;
    const MILLISECS_IN_MINUTE: number = 60000;
    //const MILLISECS_IN_HOUR: number = 3600000;
    //const MILLISECS_IN_DAY: number = 86400000;

    const SECONDS_IN_MINUTE: number = 60;
    const MINUTES_IN_HOUR: number = 60;
    //const HOURS_IN_DAY: number = 24;
    //const DAYS_IN_YEAR: number = 365;

    this.timeData = [
      { idx: 0, t: 'MILLISEC', s: MILLISECS_IN_MILLISEC, max: MILLISECS_IN_SECOND, value: 0, baseZeroToOne: 0, singleDecValue: 0 },
      { idx: 1, t: 'SEGUNDOS', s: MILLISECS_IN_SECOND, max: SECONDS_IN_MINUTE, value: 0, baseZeroToOne: 0, singleDecValue: 0 },
      { idx: 2, t: 'MINUTES', s: MILLISECS_IN_MINUTE, max: MINUTES_IN_HOUR, value: 0, baseZeroToOne: 0, singleDecValue: 0 },
      // {idx: 3, t: 'HOURS', s: MILLISECS_IN_HOUR, max: HOURS_IN_DAY, value: 0, baseZeroToOne: 0, singleDecValue: 0},
      // {idx: 4, t: 'DAYS', s: MILLISECS_IN_DAY, max: DAYS_IN_YEAR, value: 0, baseZeroToOne: 0, singleDecValue: 0}
    ]
  }

  loadDefaultConfig() {
    let config = {
      updateInterval: 31, // ms tempo entre atualizações para texto e arcos micTimer.
      timeUnitCount: 5, // número de micTimers no componente
      countdownFor: 15000,  // tempo de contagem regressiva em ms
      //warmUpFor: 3000,  // tempo de contagem regressiva em ms
      // warningFor: 1000,  // tempo de contagem regressiva em ms

      calc: { // essas variáveis ​​são colocadas aqui, pois a estrutura de configuração é um local conveniente para armazenar, passá-las. Mas não, na verdade, variáveis ​​de configuração.
        phase: 'ready', // 'warmup', 'countdown', 'warning', 'finished', 'paused', 'stopped'
        //previousPhase: 'ready', // 'warmup', 'countdown', 'warning', 'finished', 'paused', 'stopped'
        // warmUpMessage: 'pronto...'
      }
    };
    this.config = config;
  }

  constructor() {
    this.initSubjects();
    this.loadDefaultConfig();
  }

  private initSubjects() {
    this.timeDataSubject = new Subject<any>();
    this.phaseSubject = new Subject<any>();
    this.initSubject = new Subject<any>();
    this.pausePingSubject = new Subject<any>();
    this.finishedSubject = new Subject<any>();
  }

  // ** 
  // ** captadores públicos para os observadores puxarem dados
  // **
  public getTimeData(): any {
    return this.timeData;
  }

  public getPhase(): string {
    return this.config.calc.phase;
  }

  public getTimeUnitCount(): number {
    return this.config.timeUnitCount;
  }

  public getWarmUpRemaining(): number {
    return this.warmUpRemaining;
  }

  // ** 
  // ** setter público para componente
  // **
  public setWarmUpFor(warmUpFor: number): void {
    this.warmUpFor = warmUpFor;
  }
  public setCountdownFor(countdownFor: number): void {
    this.countdownFor = countdownFor;
  }
  public setWarningFor(warningFor: number): void {
    this.warningFor = warningFor;
  }

  // **
  // ** Carregar as configurações de tempo do timer
  // **
  private loadParentConfig(): void {
    this.config.warmUpFor = this.warmUpFor;
    this.config.countdownFor = this.countdownFor;
    this.config.warningFor = this.warningFor;
  }

  // **
  // ** Funcoes do timer
  // **

  // Timer Inicializacao
  public initTimer(): void {
    console.log('in initTimer');
    this.readyTimer();
    this.initChanged();
  }

  private readyTimer(): void {
    // carregar dados de configuração
    this.loadDefaultConfig();
    this.loadParentConfig();
    //carregar o objeto de dados de hora novo
    this.initRingerTimeData();
    // calcular o tempo para executar o temporizador
    this.setCountdownToTime();
    // configurar o número de unidades de tempo a processar.
    this.calcInitialTimeUnitCount();
    this.pruneTimeDataArray();

    this.setPhaseByValue('ready');
    let time = this.setTimeRemainingAndPhase();
    this.updateTimeData(time);
  }

  // Controles de timer público
  public startTimer(): void {
    if (this.config.calc.phase !== 'ready')
      return;
    // passar de pronto para aquecer;
    this.setPhaseByValue('warmup');
    this.setCountdownToTime();
    // iniciar o loop temporizador
    this.runTimer();
  }

  private runTimer(): void {
    let self = this;
    this.myD3Timer = d3.interval(function (elapsed) {
      // verifique se o tempo acabou ou se foi interrompido pelo usuário.
      if (self.isTimerFinishedOrStopped()) {
        self.myD3Timer.stop();
        self.update();
        self.resetTimer();
      } else {
        self.update();
      };
    }, this.config.updateInterval)
  }

  public pauseTimer(): void {
    this.config.calc.previousPhase = this.config.calc.phase;
    this.myD3Timer.stop();
    this.setPhaseByValue('paused');
    this.runTimer();
  }

  public unPauseTimer(): void {
    this.myD3Timer.stop();
    this.setPhaseByValue(this.config.calc.previousPhase);
    this.countdownToTime = new Date().getTime() + this.countdownRemaining;
    this.runTimer();
  }

  public stopTimer(): void {
    this.myD3Timer.stop();
    this.setPhaseByValue('stopped');
    this.runTimer();
  }

  private resetTimer(): void {
    this.readyTimer();
    this.finishedChanged();
  };


  private setCountdownToTime(): void {
    let currentTime = new Date().getTime()
    this.countdownToTime = currentTime + this.config.countdownFor + this.config.warmUpFor;
  }

  // **
  // ** atualização é chamada pelo intervalo do temporizador principal, ele simplesmente chama os métodos necessários para
  // ** atualize as informações de hora e redesenhe os objetos d3 dos componentes do temporizador.
  // **
  private update(): void {
    let time = this.setTimeRemainingAndPhase();

    if (!this.isTimerPaused())
      this.updateTimeData(time);
    else
      this.pausePing();
  }

  private setTimeRemainingAndPhase(): number {
    let time: number = 0;

    // guarde o novo tempo restante e saia
    // Verifique se já não estamos em pausa, paramos ou terminamos.
    switch (this.config.calc.phase) {
      case 'ready':
        this.countdownRemaining = this.config.countdownFor + this.config.warmUpFor;
        time = this.config.countdownFor;
        break;
      case 'warmup':
      case 'countdown':
      case 'warning':
        time = Math.max(0, this.countdownToTime - (new Date().getTime()));
        this.countdownRemaining = time;
        this.setPhase(this.countdownRemaining);
        if (this.config.calc.phase === 'warmup') {
          // Inicialmente, o tempo de contagem regressiva foi exibido durante o aquecimento - ele foi substituído pelo texto.
          time = Math.min(time, this.config.countdownFor);
          // Durante o período de um segundo, durante a fase de aquecimento, queremos que o componente alfa dos anéis de contagem regressiva e o texto subam de 0 para 1.
          this.warmUpRemaining = Math.max(0, this.countdownRemaining - this.config.countdownFor);
        };
        break;
      case 'paused':
        break;
      case 'finished':
      case 'stopped':
        this.countdownRemaining = 0;
        break;
      default:
      // normalmente lançaria erro aqui em vez de console.log
    }
    return time;
  }

  private updateTimeData(time: number): void {
    let timeInMS = time;

    for (let i = this.timeData.length - 1; i >= 0; i--) {
      let td = this.timeData[i];
      let value: number = time / td.s;
      td.singleDecValue = timeInMS / td.s;
      time -= Math.floor(value) * td.s;
      td.value = Math.floor(value);
      td.baseZeroToOne = (td.value / td.max);

      if (this.isTimerFinishedOrStopped()) {
        td.singleDecValue = 0;
        td.baseZeroToOne = 0;
      }
    }
    this.timeDataChanged();
  }

  // Notificar observadores de mudança
  private timeDataChanged(): void {
    if (this.timeDataSubject !== undefined)
      this.timeDataSubject.next(true);
  }

  private pausePing(): void {
    if (this.pausePingSubject !== undefined)
      this.pausePingSubject.next(true);
  }

  private phaseChanged(): void {
    if (this.phaseSubject !== undefined)
      this.phaseSubject.next(true);
  }

  private initChanged(): void {
    if (this.initSubject !== undefined)
      this.initSubject.next(true);
  }

  private finishedChanged(): void {
    if (this.finishedSubject !== undefined)
      this.finishedSubject.next(true);
  }

  // Puxe uma mudança de fase para a fila
  private setPhaseByValue(phase): void {
    let t = d3.timer(() => {
      this.config.calc.phase = phase;
      this.phaseChanged();
      t.stop();
    }, 0);
  };

  // Defina a fase com base no tempo do timer.
  private setPhase(timeRemaining): void {
    // isso só deve ser chamado quando o cronômetro estiver sendo executado ativamente (por exemplo, aquecimento de fase, contagem regressiva e aviso)
    if (this.config.calc.phase === 'warmup' || this.config.calc.phase === 'countdown' || this.config.calc.phase === 'warning') {
      if (timeRemaining > this.config.countdownFor) {
        this.setPhaseByValue('warmup');
      } else if ((timeRemaining <= this.config.countdownFor) && (timeRemaining > this.config.warningFor)) {
        this.setPhaseByValue('countdown');
      } else if ((timeRemaining <= this.config.warningFor) && (timeRemaining > this.config.updateInterval)) {
        this.setPhaseByValue('warning');
      } else if (timeRemaining <= this.config.updateInterval) {
        // menos de um intervalo para ir - vamos terminar.
        this.setPhaseByValue('finished');
      } else {
      }
    }
  }

  private isTimerPaused(): boolean {
    return (this.config.calc.phase === 'paused');
  }

  private isTimerFinishedOrStopped(): boolean {
    return (this.config.calc.phase === 'finished' || this.config.calc.phase === 'stopped');
  }

  // **
  // ** Determinar o número de unidades de tempo a serem processadas
  // **
  private calcInitialTimeUnitCount(): void {
    let time: number = Math.abs(this.countdownToTime - (new Date().getTime()) - +this.config.warmUpFor);
    console.log('in calcInitialTimeUnitCount=>this.countdownToTime: ' + this.countdownToTime);
    console.log('in calcInitialTimeUnitCount=>time: ' + time);
    console.log('in calcInitialTimeUnitCount=>getTime: ' + new Date().getTime());
    console.log('in calcInitialTimeUnitCount=>this.timeData.length: ' + this.timeData.length);
    for (let timeUnitCount = this.timeData.length - 1; timeUnitCount >= 0; timeUnitCount--) {
      let td = this.timeData[timeUnitCount];
      if (time > td.s)
        this.config.timeUnitCount = (timeUnitCount + 1);
    }
  }

  private pruneTimeDataArray(): void {
    // remova linhas desnecessárias da matriz timeData.
    let arrSize = this.timeData.length;
    for (let i = arrSize - 1; i > this.config.timeUnitCount; i--) {
      this.timeData.pop();
    }
  }
}