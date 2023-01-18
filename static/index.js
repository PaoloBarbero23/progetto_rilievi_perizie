"use strict"

//stringa con mail dell'utente corrente
let mail_current_user = "";

$(document).ready(function () {
	//sezione del login
	const _username = $("#txtEmail");
	const _password = $("#txtPassword");
	const _eyePwd = $("#eyePwd");
	const _btnLogin = $("#btnLogin");

	//parti del progetto
	const div_login = $("#div_login");
	const _wrapper = $("#wrapper");
	const div_user = $("#div_user");

	//sezione utente
	const _btnAddUser = $("#btnAddUser");
	const _modalUser = $("#modalUser");
	const _userDettagli = $("#userDettagli");

	//input per aggiunta utenti
	const txtEmailNew = $("#txtEmailNew");
	const txtPwdNew = $("#txtPwdNew");
	const txtRuoloNew = $("#txtRoleNew");

	//modale aggiunta utente
	const btnSaveUser = $("#btnSaveUser");
	const _newUserMailErr = $("#newUserMailErr");
	const _newUserError = $("#newUserError");

	//modale dettagli utente
	const _backgroundImg = $("#backgroundImg");
	const _imgProfilo = $("#imgProfilo");
	const _nomeUtente = $("#nomeUtente");
	const _txtEmailDettagli = $("#txtEmailDettagli")
	const _txtColorDettagli = $("#txtColorDettagli");
	const _btnSalvaDettagli = $("#btnSalvaDettagli");

	//sezioni navbar
	const btnUtenti = $("#btnUtenti");

	//tag <p> con errori
	const _mailErr = $("#mailErr");
	const _accesErr = $("#accesErr");

	//inizializzare componenti bootstrap
	var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl)
	})


	//nascondo wrapper
	//_wrapper.hide();
	div_login.show();



	_eyePwd.on("click", function () {
		if (_eyePwd.hasClass("bi bi-eye")) {
			_eyePwd.removeClass("bi bi-eye");
			_eyePwd.addClass("bi bi-eye-slash");
			_password.prop("type", "text");
		}
		else {
			_eyePwd.removeClass("bi bi-eye-slash");
			_eyePwd.addClass("bi bi-eye");
			_password.prop("type", "password");
		}
	})

	//controlla quando l'input mail perde il focus
	_username.on("blur", function () {
		if (_username.val() != "") {//controllo che non sia vuoto, perchè non voglio che mi dia errore se non ho ancora scritto nulla
			let regMail = new RegExp("^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$");//regex per la mail
			if (!regMail.test(_username.val())) {
				_username.addClass("input-error");
				_mailErr.text("il campo deve contenere una mail valida")
			}
			else {
				_username.removeClass("input-error");
				_mailErr.text("");
			}
		}
		else {
			_username.removeClass("input-error");
			_mailErr.text("");
		}
	});

	_btnLogin.on("click", function () {
		controllaLogin();
	});

	$(document).on('keydown', function (event) {
		if (event.keyCode == 13)
			controllaLogin();
	});

	_btnAddUser.on("click", function () {
		_modalUser.show();
		//svuoto i campi
		txtEmailNew.val("");
		txtPwdNew.val("");
		txtRuoloNew.prop("selectedIndex", 0);

	});

	btnUtenti.on("click", () => {
		inserisciUtenti()
	});

	txtEmailNew.on("blur", function () {
		if (txtEmailNew.val() != "") {//controllo che non sia vuoto, perchè non voglio che mi dia errore se non ho ancora scritto nulla
			let regMail = new RegExp("^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$");//regex per la mail
			if (!regMail.test(txtEmailNew.val())) {
				txtEmailNew.addClass("input-error");
				_newUserMailErr.text("il campo deve contenere una mail valida")
			}
			else {
				txtEmailNew.removeClass("input-error");
				_newUserMailErr.text("");
			}
		}
		else {
			txtEmailNew.removeClass("input-error");
			_newUserMailErr.text("");
		}
	});

	btnSaveUser.on("click", function () {
		//controllo campi che siano compilati
		if (txtEmailNew.val() == "") {
			_newUserMailErr.text("Inserire una mail");
			return;
		}
		//se la password è vuota, il valore default è "password"
		let formData = new FormData();
		formData.append("mail", txtEmailNew.val());
		formData.append("password", txtPwdNew.val() == "" ? "password" : txtPwdNew.val());
		if ($("#txtImgNew").prop("files")[0] )
			formData.append("img", $("#txtImegNew").prop("files")[0]);
		if ($("#txtUsernameNew").val() != "")
			formData.append("username", $("#txtUsernameNew").val());
		let requestnewUser = inviaRichiestaMultipart("POST", "/api/newUser", formData);
		requestnewUser.fail((jqXHR, testStatus, strError) => {
			if (jqXHR.status == 401) //401 => utente non autorizzato
				_newUserMailErr.text("mail già presente");
			else
				errore(jqXHR, testStatus, strError)
		});
		requestnewUser.done((data) => {
			console.log(data);
			inserisciUtenti();
			$("#btnCloseModal").trigger("click");
		})

	});


	function controllaLogin() {
		if (_username.val() == "" || _password.val() == "") {
			_accesErr.text("inserire username e password");
		}
		else {
			_accesErr.text("");
			let request = inviaRichiesta("POST", "/api/login", { "username": _username.val(), "password": _password.val() });
			request.fail((jqXHR, testStatus, strError) => {
				if (jqXHR.status == 401) //401 => utente non autorizzato
					_accesErr.text("username o password errati");
				else
					errore(jqXHR, testStatus, strError)
			});
			request.done((data) => {
				mail_current_user = data.mail;
				div_login.hide();
				_wrapper.show();
			});
		}
	}

	function inserisciUtenti() {
		let requestUtenti = inviaRichiesta("POST", "/api/showUtenti")
		requestUtenti.fail(errore)
		requestUtenti.done((data) => {
			console.log(data)

			//rimuovo righe con classe usershow
			$(".usershow").parent().remove();
			//creazione riga
			for (const user of data) {
				let btn;
				let text = "";
				let div = $("<div>").addClass("row").insertBefore(_btnAddUser.parent().parent());
				let col = $("<div>").addClass("col-md-12 usershow").appendTo(div);
				let divOptions = $("<div>").addClass("col-md-7 text-truncate").appendTo(col);
				text = user.username ? user.username : user.mail;//se username è null, allora metto la mail
				if (user.mail == mail_current_user)
					divOptions.html(text + " (tu)");
				else
					divOptions.html(text);

				divOptions = $("<div>").addClass("col-md-5 options").appendTo(col).prop("utente", user)
				if (user.admin == true) {
					//aggiunge il badge che indica che è un admin
					let span = $("<span>").addClass("badge bg-primary amministratore").text("admin").appendTo(divOptions);
					$("<i>").addClass("bi bi-shield-lock-fill").appendTo(span);
					//mettere line barrata al nome dell'utente
					
				}
				else {
					if (user.deleted)//aggiungo badge rosso deleted
					{
						let span = $("<span>").addClass("badge bg-danger deleted").text("deleted").appendTo(divOptions);
						$("<i>").addClass("bi bi-x-circle-fill").appendTo(span);
						divOptions.parent().children("div").eq(0).css("text-decoration", "line-through");
					}
					else {
						btn = $("<button>").prop("utente", user).addClass("delete bi bi-person-x-fill detail").appendTo(divOptions).on("click", function () {
							let utente = $(this).parent().prop("utente");
							//swal.fire con checkbox per confermare eliminazione
							swal.fire({
								title: 'Sei sicuro di voler eliminare l\'utente?',
								text: "Non potrai annullare l'operazione!",
								icon: 'warning',
								input: 'checkbox',
								inputPlaceholder: 'Rimuovi anche le perizie dell\'utente',
								showCancelButton: true,
								confirmButtonColor: '#3085d6',
								cancelButtonColor: '#d33',
								confirmButtonText: 'Conferma',
								cancelButtonText: 'Annulla'
							}).then((result) => {
								if (result.isConfirmed) {

									//see the value of the checkbox
									let checkbox = result.value;

									let requestDelete = inviaRichiesta("POST", "/api/deleteUser", { "mail": utente.mail, "delete": checkbox });
									requestDelete.fail(errore);
									requestDelete.done((data) => {
										inserisciUtenti();
									});
								}
							});

						});
					}
					//aggiunta icona per eliminare l'utente


				}
				//aggiunta icona per visualizzare i dati utente
				btn = $("<button>").attr({ "data-bs-toggle": "modal", "data-bs-target": "#userDettagli" }).addClass("detail").appendTo(divOptions);
				$("<i>").addClass("bi bi-person-circle dettagliUser").appendTo(btn)
				btn.on("click", function () {
					let utente = $(this).parent().prop("utente");
					if (utente.image)
						_imgProfilo.prop("src", utente.image);
					else
						_imgProfilo.prop("src", "img/user.jpg");
					if (utente.username)
						_nomeUtente.text(utente.username);
					else
						_nomeUtente.html("<i>Nessun username</i>");
					_txtEmailDettagli.val(utente.mail);
					if (utente.color)
						_txtColorDettagli.val(utente.color);
					else
						_txtColorDettagli.val("#FF0000");
				});
			}
		})
	}

	_btnSalvaDettagli.on("click", function () {
		let param = {};
		param.mail = _txtEmailDettagli.val();
		param.color = _txtColorDettagli.val();
		let request = inviaRichiesta("POST", "/api/updateUser", param);
		request.fail(errore);
		request.done((data) => {
			console.log(data);
			$("#btnChiudiDettagli").trigger("click");
			inserisciUtenti();
		})

	});

	//









});