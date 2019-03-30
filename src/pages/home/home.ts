import { Component } from '@angular/core';

import { NavController } from 'ionic-angular';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  // variáveis ​​para o componente 
  ringTimerAction: string;

  warmUpFor: number = 5000;
  //aqui eu defino o time
  countdownFor: number = 6000;
  warningFor: number = 1000;

  startMicTimerBtnDisabled: boolean = false;

  // Variáveis ​​de desativação de botões
  warmupUpBtnDisabled: boolean = false;
  countdownUpBtnDisabled: boolean = false;
  warningUpBtnDisabled: boolean = false;
  warmupDownBtnDisabled: boolean = false;
  countdownDownBtnDisabled: boolean = false;
  warningDownBtnDisabled: boolean = false;

  constructor(public navCtrl: NavController) { }

  disableControlBtns(disabled: boolean) {
    this.warmupUpBtnDisabled = disabled;
    this.countdownUpBtnDisabled = disabled;
    this.warningUpBtnDisabled = disabled;

    this.warmupDownBtnDisabled = disabled;
    this.countdownDownBtnDisabled = disabled;
    this.warningDownBtnDisabled = disabled;
  }
  // **
  // ** ações no componente
  // **
  onStartMicTimer() {
    this.ringTimerAction = "start";
    this.startMicTimerBtnDisabled = true;
    this.disableControlBtns(true);
  }

  onFinished() {
    this.ringTimerAction = "stopped";
    this.startMicTimerBtnDisabled = false;
    this.disableControlBtns(false);
  }
}
