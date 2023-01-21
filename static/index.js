"use strict"

//stringa con mail dell'utente corrente
let mail_current_user = "";
const map_icon = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"

const markerColor = "FF3333";

//funzione che viene eseguita quando la pagina carica
window.onload = async function () {

	await caricaGoogleMaps();
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

	//div mappa
	const _divMappa = $("#divMappa");
	const _map = $("#map").get(0);

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


	//mostro la mappa di Google Maps

	let geocoder = new google.maps.Geocoder();
	geocoder.geocode({
		"address": "Fossano Via San Michele 68"
	}, (result, status) => {
		console.log(result);
		if (status == google.maps.GeocoderStatus.OK) {

			let mapOptions = {
				"center": result[0].geometry.location,
				"zoom": 12,
				"mapTypeId": google.maps.MapTypeId.ROADMAP
			};
			let mapID = new google.maps.Map(_map, mapOptions);
			let position = new google.maps.LatLng(result[0].geometry.location)
			//change the marker color
			console.log(google.maps.SymbolPath)
			const svgMarker = {
				path: map_icon,
				fillColor: "#FF0000",
				fillOpacity: 1,
				strokeWeight: 2,
				strokeColor: "#00000",
				rotation: 0,
				scale: 1.8,
				anchor: new google.maps.Point(0, 20),
			};
			var marker = new google.maps.Marker({
				icon: svgMarker,
				map: mapID,
				position: position
			});



			let infoWindowOption = {
				"content": "Sede principale",
				"width": 150
			}
			let infoWindow = new google.maps.InfoWindow(infoWindowOption);
			marker.addListener("click", function () {
				//console.log(marcatori);
				//console.log(ristoranti.length % ristorante.id);
				infoWindow.open(mapID, marker);
			})


			let requestMarker = inviaRichiesta("POST", "/api/getPerizie");
			requestMarker.fail(errore);
			requestMarker.done((data) => {
				console.log(data);
				for (const item of data) {
					let perizie = item.perizie;
					for (const perizia of perizie) {
						console.log(perizia);
						let position = new google.maps.LatLng(perizia.coord.lat, perizia.coord.lon)
						const svgMarker = {
							path: map_icon,
							fillColor: item.color,
							fillOpacity: 1,
							strokeWeight: 2,
							strokeColor: "#000000",
							rotation: 0,
							scale: 1.8,
							anchor: new google.maps.Point(0, 20),
						};
						var marker = new google.maps.Marker({
							icon: svgMarker,
							map: mapID,
							position: position
						});


						let infoWindowOption = {
							"content": `<b class='title'>${perizia.nome}</b>
										<hr>
										<div>
										<p class='content'>${perizia.descrizione}</p>
										<p class='content'><b>Perizia effettuata il:</b> ${perizia.data}</p>
										<p class='content'><b>Perizia fatta da:</b> ${!item.username ? item.mail : item.username}</p>
										</div>
										`,
							"width": 150
						}
						let infoWindow = new google.maps.InfoWindow(infoWindowOption);
						marker.addListener("click", function () {
							//console.log(marcatori);
							//console.log(ristoranti.length % ristorante.id);
							infoWindow.open(mapID, marker);
						})
					}
				}
			});
		}
	})









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
		if ($("#txtImgNew").prop("files")[0])
			formData.append("img", $("#txtImgNew").prop("files")[0]);
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
				if (user.admin == true) {//aggiunge il badge che indica che è un admin
					let span = $("<span>").addClass("badge bg-primary amministratore").text("admin").appendTo(divOptions);
					$("<i>").addClass("bi bi-shield-lock-fill").appendTo(span);
				}
				else {
					if (user.deleted)//aggiungo badge deleted, barro l'utente e aggiungo pulsante per togliere le perizie
					{
						let span = $("<span>").addClass("badge bg-danger amministratore").text("deleted").appendTo(divOptions);
						$("<i>").addClass("bi bi-x-circle-fill").appendTo(span);
						btn = $("<button>").prop("utente", user).addClass("detail").appendTo(divOptions).on("click", lastDelete)
						$("<i>").addClass("bi bi-x-square-fill dettagliUser").appendTo(btn);
						divOptions.parent().children("div").eq(0).css("text-decoration", "line-through");
					}
					else {
						btn = $("<button>").prop("utente", user).addClass("detail").appendTo(divOptions).on("click", deleteUser);
						$("<i>").addClass("bi bi-person-x-fill").appendTo(btn);
					}
				}
				if (!user.deleted) {
					//aggiunta icona per visualizzare i dati utente
					btn = $("<button>").attr({ "data-bs-toggle": "modal", "data-bs-target": "#userDettagli" }).addClass("detail").appendTo(divOptions);
					$("<i>").addClass("bi bi-person-circle dettagliUser").appendTo(btn)
					btn.on("click", visualizzaDettagli);
				}
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

	function lastDelete() {
		let utente = $(this).parent().prop("utente");
		//swal.fire con checkbox per confermare eliminazione
		swal.fire({
			title: 'Vuoi eliminare tutte le perizie dell\'utente?',
			text: "L'utente verrà cancellato definitivamente",
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Conferma',
			cancelButtonText: 'Annulla'
		}).then((result) => {
			if (result.isConfirmed) {
				let requestDelete = inviaRichiesta("POST", "/api/deleteUser", { "mail": utente.mail, "delete": 1 });
				requestDelete.fail(errore);
				requestDelete.done((data) => {
					swal.fire({
						title: 'Operazione eseguita con successo',
						icon: 'L\'utente è stato eliminato definitivamente',
						confirmButtonText: 'Ok'
					});
					inserisciUtenti();
				});
			}
		});
	}

	function visualizzaDettagli() {

		let utente = $(this).parent().prop("utente");
		if (utente.img)
			_imgProfilo.prop("src", utente.img);
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

	}

	function deleteUser() {
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
					//sweetallert con messaggio di conferma
					swal.fire({
						title: 'Operazione eseguita con successo',
						icon: 'success',
						confirmButtonText: 'Ok'
					});
					inserisciUtenti();
				});
			}
		});

	}

	function caricaGoogleMaps() {
		const URL = "https://maps.googleapis.com/maps/api"
		let promise = new Promise(function (resolve, reject) {
			let script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = URL + '/js?&key=' + MAP_KEY + '&v=3&libraries=marker';
			document.body.appendChild(script);
			script.onload = resolve;
			script.onerror = reject;
		})
		return promise;
	}







}