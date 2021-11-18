var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
    return typeof obj;
}
: function(obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
}
;

var _createClass = function() {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value"in descriptor)
                descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
        }
    }
    return function(Constructor, protoProps, staticProps) {
        if (protoProps)
            defineProperties(Constructor.prototype, protoProps);
        if (staticProps)
            defineProperties(Constructor, staticProps);
        return Constructor;
    }
    ;
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

// форма поиска туров
var SEARCH_TYPE_TOURS = 'tours';
var SEARCH_TYPE_HOTELS = 'hotels';

var SearchForm = function() {
    function SearchForm($elem, params) {
        _classCallCheck(this, SearchForm);

        if ($elem == null || $elem.length === 0) {
            return;
        }

        this.mode = params.mode || SEARCH_TYPE_TOURS;
        window.searchOnlyHotels = this.mode === SEARCH_TYPE_HOTELS;
        this.debounceInputTime = 300;
        this.destinationAutocompleteCssClass = 'clever-list-autocomplete';
        this.hotelAutocompleteCssClass = 'clever-list-hotels-autocomplete';
        this.resultsTableSelector = '#js-ht-results-table';
        this.type = 'full';
        // full|mini
        this.element = $elem;
        this.data = {};
        this.hotelsSearchDirectionsData = {};
        this.regions = [];
        this.countries = [];
        this.debug = false;
        this.forwarding = true;
        // default values
        this.city_id = null;
        this.country_id = null;
        this.region_id = null;
        this.hotel_id = null;
        this.hotels = [];
        this.hotel_data = {};
        this.date = moment();
        this.dateDelta = true;
        this.delta = 3;
        this.nights = [7, 9];
        this.adult = 2;
        this.child = 0;
        this.maxChildren = 4;
        this.ages = [];
        this.stars = 'all';
        // для поиска отелей
        this.dateFrom = moment();
        this.dateTo = moment().add(7, 'd');
        this.splitRooms = false;
        this.splitRoomsValueIsSetFromUrl = false;
        // сохранять в history и менять url
        this.useHistory = true;

        this.is_changeCity = true;
        // была ли смена города
        this.is_manager = false;
        this.params = {
            fromDb: true
        };
        if (params.params) {
            for (var i in params) {
                this.params[i] = params.params[i];
            }
        }

        if (_typeof(this.hotel_data) !== 'object') {
            this.hotel_data = {};
        }

        this.onStartSearch = null;
        // trigger при начале поиска
        this.historyList = false;
        this.timers = {
            enter: null,
            request: null
        };
        /**
         * Предпочтительный вылет из другого города
         * @type {{}}
         */
        this.preferCities = {};

        this.lazyLoading = false;
        this.starsClickInit = false;

        this.$loading = $('.w-search-loading');

        this.setOptions(params);

        this.elems = {
            city: null,
            country: null,
            region: null,
            date: null,
            nights: null,
            adults: null,
            childs: null,
            ages: [],
            ageInputs: null,
            stars: null,
            // поиск отелей
            dateFrom: null,
            dateTo: null,
            splitRooms: null
        };

        if (this.lazyLoading) {
            this.loadData();
        } else {
            this.createDataFromCountrySelectHotelsSearch();
            this.handlers();
            this.$loading.addClass('hidden');
        }
    }

    _createClass(SearchForm, [{
        key: 'loadData',
        value: function loadData() {
            var _this = this;

            // set loading state
            this.$loading.removeClass('hidden');
            $.getJSON('/findForm/getMainData', {}, function(data) {
                if (!data.success) {
                    _this.element.remove();
                }
                _this.data = data.data;
                _this.regions = data.regions;
                _this.countries = data.countries;
                _this.handlers();
                // this.setCountry();
                _this.resetNights();
                _this.$loading.addClass('hidden');
                _this.createDataFromCountrySelectHotelsSearch();
            });
        }
    }, {
        key: 'setCountry',
        value: function setCountry() {
            if (!this.country_id) {
                // вызываем beforeCountryListShow чтобы список точно был отрисован,
                // иначе не отработают set от hSelect
                this.beforeCountryListShow();
                // получаем первую страницу в списке
                var firstCountryID = this.elems.country.$items.find('.h-select-item:first').data('value');
                this.elems.country.set(firstCountryID, false);
            }
        }
    }, {
        key: 'setOptions',
        value: function setOptions(params) {
            for (var k in params) {
                if (k in this && params.hasOwnProperty(k)) {
                    this[k] = params[k];
                } else if (this.debug) {
                    console.log('SearchForm: unknown param ' + k);
                }
            }
        }
    }, {
        key: 'getCleverListRow',
        value: function getCleverListRow(params) {
            var result = {
                type: '',
                countryId: null,
                countryName: '',
                countryNameEn: '',
                regionId: null,
                regionName: '',
                hotelId: null,
                hotelName: '',
                isDepart: params.isDepart || false,
                departCityId: params.departCityId || null,
                departCityFrom: params.departCityFrom || ''
            };

            switch (params.type) {
            case 'country':
                result.type = 'country';
                result.countryId = params.countryId;
                result.countryNameEn = params.countryNameEn;
                result.countryName = params.countryName;
                break;
            case 'region':
                result.type = 'region';
                result.regionId = params.regionId;
                result.regionName = params.regionName;
                result.countryId = params.countryId;
                result.countryName = params.countryName;
                break;
            case 'hotel':
                result.type = 'hotel';
                result.hotelId = params.hotelId;
                result.hotelName = params.hotelName;
                result.regionName = params.regionName;
                result.countryId = params.countryId;
                result.countryName = params.countryName;
                break;
            }

            return result;
        }
    }, {
        key: 'renderDestinationLabel',
        value: function renderDestinationLabel() {
            if (!this.hotel_id && !this.region_id && !this.country_id) {
                return;
            }

            var itemLabel = '';
            var country = void 0
              , hotel = void 0
              , region = void 0;

            // country = this.data[city].countries[this.country_id];
            country = this.countries[this.country_id];
            if (this.hotel_id) {
                hotel = this.hotel_data[this.hotel_id];
                itemLabel = hotel.name;
            } else {
                country = this.countries[this.country_id];
                itemLabel = country.name;
                if (this.region_id) {
                    region = this.regions[this.country_id][this.region_id];
                    itemLabel += ', ' + region.name;
                }
            }

            /* flag = country.code;
            //ставим флаг, и заменяем дефолтный реплейс на название страны
            ui.$facewrap.find('.w-st-icon img')
                .addClass('w-st-icon__flag')
                .prop('src', '/img/flag2/' + flag + '.png');*/

            var $input = this.elems.country.$face.find('input');
            if ($input.length) {
                $input.addClass('filled').val(itemLabel);
            } else {
                this.elems.country.$face.html('<span>' + itemLabel + '</span>');
            }
        }
        // обработчики событий

    }, {
        key: 'handlers',
        value: function handlers() {
            var _this2 = this;

            var that = this;
            var self = this;
            this.showFromMode();

            window.addEventListener('search:repeat-search', function() {
                _this2.onSubmit(true);
            });

            jQuery(document).ready(function($) {
                that.elems.city = new hSelect({
                    selector: '#w-st-city',
                    theme: 'main-form',
                    showOn: 'click',
                    checkHeight: false,
                    checkWidth: false,
                    onChange: function onChange(ui, text) {
                        that.onCityChange(ui.value, ui, text);
                        this.$facewrap.data('changed', 1);
                        that.changeHiddenValue('sfHiddenCity', ui.value);
                        that.resetDatepickerDate();
                        that.resetNights();
                        that.updateDesc();
                    }
                });

                // страна
                that.elems.country = new hSelect({
                    selector: '#w-st-country',
                    theme: 'main-form',
                    checkHeight: false,
                    dynamicItems: true,
                    checkWidth: false,
                    onFaceClick: function onFaceClick(e) {
                        if ($(e.target).closest('.h-select-reset').length !== 0 || $(e.target).hasClass('h-select-reset')) {
                            that.resetCountry();
                            that.resetNights();
                            this.hide(e);
                        } else {
                            var $input = this.$face.find('input');
                            // Курсор в конце
                            var len = $input.val().length;
                            $input.focus();
                            if ($input[0].setSelectionRange) {
                                $input[0].setSelectionRange(len, len);
                            }
                            if (!this.isShown()) {
                                this.show(e);
                            }
                        }
                    },
                    onHide: function onHide() {
                        if (!that.country_id) {
                            this.$face.find('input').val('');
                        } else {
                            // возвращаем предыдущее значение
                            that.renderDestinationLabel();
                        }
                        this.$face.find('input').trigger('blur');
                    },
                    onShowItem: function onShowItem(ui, e) {
                        that.beforeCountryListShow();
                    },
                    onChange: function onChange(ui, text, $elem) {
                        that.onCountryChange(ui.value, ui, $elem);
                        that.resetDatepickerDate();
                        that.resetNights();
                        that.updateDesc();
                    },
                    onItemClick: function onItemClick($elem) {
                        if ($elem.data('disabled')) {
                            return;
                        }
                        var val = $elem.data('value');
                        if (val !== this.value) {
                            var view = $elem.html();
                            if (typeof $elem.data('text') !== 'undefined' && $elem.data('text') !== '') {
                                view = $elem.data('text');
                            }
                            this.$items.find('.h-select-item__active').removeClass('h-select-item__active');
                            $elem.addClass('h-select-item__active');
                            // this.onChange(val, view, $elem);
                            this.value = val;
                            this.$face.data('value', val);
                            if (typeof this.handleOnChange === 'function') {
                                this.handleOnChange(this, view, $elem);
                            }
                        }
                        var hide = false;
                        ['h-select-item__hotel', 'h-select-region-all', 'h-select-item__region'].forEach(function(cls) {
                            if ($($elem).hasClass(cls)) {
                                hide = true;
                            }
                        });
                        if (!hide) {
                            if (this.$items.find('.' + that.destinationAutocompleteCssClass).length) {
                                // Если выбрано с автокомплита - перерисовываем и список стран
                                that.beforeCountryListShow();
                            } else {
                                that.showExtendCountryForm();
                            }
                        }
                        if (hide) {
                            this.hide();
                        }
                    }
                });

                var $country = that.elems.country.element;
                $country.on('keyup', '.destination-field', function() {
                    that.onDestinationEnter($(this).val(), $(this));
                });
                $country.on('keyup', '.js-hotel-search-field', function() {
                    that.onHotelEnter($(this).val(), $(this));
                });

                // ночей
                that.elems.nights = new hSelect({
                    selector: '#w-st-nights',
                    theme: 'main-form',
                    checkHeight: false,
                    dynamicItems: true,
                    onItemMouseEnter: function onItemMouseEnter($elem) {
                        $elem.addClass('h-select-item__hovered');
                        $elem.next().addClass('h-select-item__hovered_ex');
                        $elem.prev().addClass('h-select-item__hovered_ex');
                    },
                    onItemMouseLeave: function onItemMouseLeave($elem) {
                        $elem.removeClass('h-select-item__hovered');
                        $elem.next().removeClass('h-select-item__hovered_ex');
                        $elem.prev().removeClass('h-select-item__hovered_ex');
                    },
                    onItemClick: function onItemClick($elem, singleValue) {
                        var val = $elem.data('value');
                        var valPrev = val;
                        var valNext = val;
                        this.value = val;
                        if (!singleValue) {
                            if ($elem.prev().length !== 0) {
                                valPrev = $elem.prev().data('value');
                            }
                            if ($elem.next().length !== 0) {
                                valNext = $elem.next().data('value');
                            }
                        }

                        that.nights = [valPrev, valNext];
                        that.changeHiddenValue('sfHiddenDaysFrom', valPrev);
                        that.changeHiddenValue('sfHiddenDaysTo', valNext);
                        this.$items.find('.h-select-item__active').removeClass('h-select-item__active');
                        this.$items.find('.h-select-item').removeClass('h-select-item__active_ex');
                        $elem.addClass('h-select-item__active');
                        if (!singleValue) {
                            $elem.prev().addClass('h-select-item__active_ex');
                            $elem.next().addClass('h-select-item__active_ex');
                        }
                        this.hide();

                        var view = valPrev + (valPrev !== valNext ? '-' + valNext : '') + ' ' + getnoun(valNext, 'день', 'дня', 'дней');
                        if (that.type === 'mini') {
                            view = (valPrev !== valNext ? 'от ' + valPrev + ' до ' + valNext : 'на ' + valNext) + ' ' + getnoun(valNext, 'день', 'дня', 'дней');
                        }

                        this.onChange(val, view, $elem);

                        that.updateDesc();
                    }
                });

                // звезды
                that.elems.stars = new hSelect({
                    selector: '#w-st-stars',
                    theme: 'main-form',
                    checkHeight: false,
                    onChange: function onChange(ui) {
                        that.stars = ui.value;
                        that.changeHiddenValue('sfHiddenStars', ui.value);
                        that.updateDesc();
                    }
                });

                // разделить на 2 номера
                _this2.elems.splitRooms = {
                    $checkBox: $('#w-st-split-rooms'),
                    $wrapper: _this2.element.find('.js-w-st-split-rooms-container'),
                    hidden: true
                };
                _this2.elems.splitRooms.$checkBox.on('change', function(e) {
                    _this2.setSplitRoomsVal(e.target.checked);
                    _this2.splitRoomsValueIsSetFromUrl = false;
                });
                _this2.toggleSplitRoomsCheckbox();
                if (_this2.splitRoomsValueIsSetFromUrl) {
                    _this2.elems.splitRooms.$checkBox.prop('checked', _this2.splitRooms);
                }

                // выбор людей
                // кол-во взрослых
                self.elems.adults = new Counter($('.adults-count', self.element),{
                    min: 1,
                    max: 10
                },self.adult,function(newValue, isHumanChange) {
                    self.adult = newValue;
                    self.renderTourists();
                    self.changeHiddenValue('sfHiddenAdult', self.adult);
                    self.updateDesc();
                    self.toggleSplitRoomsCheckbox();
                }
                );

                that.elems.peoples = new hSelect({
                    selector: '#w-st-peoples',
                    theme: 'main-form',
                    checkHeight: false,
                    checkWidth: false
                });
                self.elems.ageInputs = $('.ages input', self.element);
                for (var i = 0; i < self.elems.ageInputs.length; i++) {
                    self.elems.ages.push($(self.elems.ageInputs[i]));
                }
                // кол-во детей
                self.elems.children = new Counter($('.children-count', self.element),{
                    min: 0,
                    max: self.maxChildren
                },self.child,function(newValue, isHumanChange) {
                    self.child = newValue;
                    self.renderTourists();
                    self.changeHiddenValue('sfHiddenChilds', self.child);
                    self.checkChildAges();
                    self.updateDesc();
                    self.toggleSplitRoomsCheckbox();
                }
                );

                self.elems.ageInputs.on('change', function() {
                    self.checkChildAges();
                });

                // дата
                that.elems.date = new hSelect({
                    selector: '#w-st-date',
                    theme: 'main-form',
                    disabled: true,
                    dynamicItems: true,
                    onShowItem: function onShowItem() {
                        $('#w-st-datepicker_container').datepicker('setDate', that.date.toDate());
                    },

                    showOn: 'click',
                    onBodyClick: function onBodyClick(e) {
                        return $(e.target).closest('.ui-datepicker-header').length === 0;
                    },

                    itemsType: 'container',
                    checkHeight: false,
                    checkWidth: false
                });

                $('#w-st-delta').on('change', function() {
                    that.dateDelta = $(this).prop('checked');
                    var nDate = that.date.clone();
                    var fromDate = nDate.format('D.M.YYYY');
                    /*
                    if(that.dateDelta){
                        var fromDate = nDate.subtract(that.delta, 'd').format('D.M.YYYY')
                        var toDate = nDate.add(2* that.delta, 'd').format('D.M.YYYY');
                    }
                    */
                    that.refreshDateField();
                    that.changeHiddenValue('sfHiddenDateFrom', fromDate);
                    that.changeHiddenValue('sfHiddenDateDelta', that.dateDelta ? 1 : 0);

                    that.updateDesc();
                });

                // дата от при поиске отеля
                that.elems.dateFrom = new hSelect({
                    selector: '#w-st-date-range-from',
                    theme: 'main-form',
                    disabled: true,
                    dynamicItems: true,
                    onShowItem: function onShowItem() {
                        $('#w-st-datepicker-range-from_container').datepicker('setDate', that.dateFrom.toDate());
                    },

                    showOn: 'click',
                    onBodyClick: function onBodyClick(e) {
                        return $(e.target).closest('.ui-datepicker-header').length === 0;
                    },

                    itemsType: 'container',
                    checkHeight: false,
                    checkWidth: false
                });
                that.elems.dateTo = new hSelect({
                    selector: '#w-st-date-range-to',
                    theme: 'main-form',
                    disabled: true,
                    dynamicItems: true,
                    onShowItem: function onShowItem() {
                        $('#w-st-datepicker-range-to_container').datepicker('setDate', that.dateTo.toDate());
                    },

                    showOn: 'click',
                    onBodyClick: function onBodyClick(e) {
                        return $(e.target).closest('.ui-datepicker-header').length === 0;
                    },

                    itemsType: 'container',
                    checkHeight: false,
                    checkWidth: false
                });

                // переключение поиска
                var $switchTabs = $('.js-search-switch');
                $switchTabs.on('click', function() {
                    var $el = $(this);
                    var mode = $el.data('tab');
                    window.searchOnlyHotels = mode === SEARCH_TYPE_HOTELS;
                    if (mode !== that.mode) {
                        that.mode = mode;
                        $switchTabs.toggleClass('w-search-switch-tab-active');
                        that.showFromMode();
                    }
                });

                // русская локализация
                $.datepicker.setDefaults({
                    monthNames: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
                    monthNamesShort: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
                    currentText: 'Сегодня',
                    closeText: 'Закрыть',
                    dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                    prevText: 'Предыдущий месяц',
                    nextText: 'Следующий месяц'
                });

                // геотаргетинг
                $(window).on('onLocation', function(event, city, city_id) {
                    var isChanged = parseInt(that.elems.city.$facewrap.data('changed'), 10) !== 0;
                    if (!isChanged) {
                        // если пользователь еще не выбрал город сам
                        if (!that.elems.city.existByName(city) && cities.hasOwnProperty(city_id)) {
                            // если такого определенного города в списке, то берем альтернативный город
                            city = cities[city_id].phoneCity.name;
                        }
                        that.elems.city.setByName(city);
                        // меняем город вылета
                        // так как это фейковое нажатие, то сбрасываем флаг
                        that.elems.city.$facewrap.data('changed', 0);
                        // клика
                    }
                });

                // submit
                that.element.on('click', '#w-st-findtours', function(e) {
                    return that.onSubmit();
                });

                $('#repeatCurrentSearch').on('click', function(e) {
                    return that.onSubmit();
                });

                $('#w-st-button').on('click', function(e) {
                    e.preventDefault();
                    $('.w-search_form').slideDown(200).css('overflow', 'visible');
                    $('.w-search_button').hide();
                });

                that._initializeHistory();
            });
        }
    }, {
        key: 'showFromMode',
        value: function showFromMode() {
            var $form = $('.w-search_form');
            if (this.mode === SEARCH_TYPE_HOTELS) {
                $form.addClass('w-search_form-hotels');
                $('#sfHiddenDateDelta, #sfHiddenDateDelta').attr('disabled', 'disabled');
                $('#sfHiddenDateTo, #sfHiddenHotelsSearch').attr('disabled', null);
            } else {
                $form.removeClass('w-search_form-hotels');
                $('#sfHiddenDateDelta, #sfHiddenDateDelta').attr('disabled', null);
                $('#sfHiddenDateTo, #sfHiddenHotelsSearch').attr('disabled', 'disabled');
            }
            $(window).trigger('switchSearchType', [this.mode]);
        }
    }, {
        key: 'checkChildAges',
        value: function checkChildAges() {
            var ages = [];
            if (this.elems.ageInputs === null) {
                return;
            }
            this.elems.peoples.$facewrap.removeClass('h-select-face__error');
            this.elems.ageInputs.removeClass('danger');
            this.elems.ageInputs.each(function() {
                var $self = $(this);
                var age = $self.val();
                if (age !== '') {
                    if (age > 15) {
                        $self.addClass('danger');
                    } else {
                        ages.push(parseInt(age, 10));
                    }
                }
            });
            this.ages = ages.slice(0, this.child);
            this.changeHiddenValue('sfHiddenAges', this.ages.join(','));
        }
    }, {
        key: 'renderTourists',
        value: function renderTourists() {
            var touristsText = this.adult + ' взр';
            if (this.child > 0) {
                touristsText += ', ' + this.child + ' дет';
            }
            this.updateAgesFields();
            this.element.find('.search-field-peoples .h-select-face').text(touristsText);
        }
    }, {
        key: 'updateAgesFields',
        value: function updateAgesFields() {
            var i = 0;
            var self = this;
            var agesWrapper = this.element.find('.ages');
            var inputs = agesWrapper.find('input');
            inputs.addClass('hidden');
            agesWrapper.addClass('hidden');
            inputs.each(function() {
                if (i < self.child) {
                    var $self = $(this);
                    $self.removeClass('hidden');
                    var age = typeof self.ages[i] !== 'undefined' ? self.ages[i] : '';
                    $self.val(age);
                }
                i++;
            });
            if (this.child > 0) {
                agesWrapper.removeClass('hidden');
            }

            this.changeHiddenValue('sfHiddenChild', this.child);
            this.changeHiddenValue('sfHiddenAges', this.ages.join(','));
        }
        // смена города вылета

    }, {
        key: 'onCityChange',
        value: function onCityChange(value, ui) {
            this.city_id = value;
            this.is_changeCity = true;

            // меняем текст
            jQuery('#w-st-city-title').text(this.data[value].name2);

            // при смене города меняется список стран, проверяем есть ли выбранная страна
            // в новом списке и если есть то оставляем ее, иначе заменяем за новую и меняем текст
            if (this.country_id && !(this.country_id in this.data[this.city_id].countries)) {
                this.resetCountry(ui);
                // this.setCountry();
            }
        }
    }, {
        key: 'showExtendCountryForm',
        value: function showExtendCountryForm() {
            var html = '';
            if (this.country_id == null) {
                html = '<div class="empty-country">' + '<img src="/img/svg/icons/arrows/left-long-yellow.svg" width="35"> Выберите страну</div>';
            } else {
                var hotelHtml = '<h4 class="h-select-extend-title">Поиск по отелю:</h4>';
                hotelHtml += "<div class='h-select-hotel-form'>" + "<input class='h-select-hotel-name js-hotel-search-field' data-country='" + this.country_id + "'" + " placeholder='Введите название отеля' />" + "</div><div class='clever-list-hotels-autocomplete hidden'></div>";
                html = hotelHtml + this.getRegionsHtml();
            }

            this.elems.country.$items.find('.h-select-right-side').remove();
            this.elems.country.$items.append('<div class="h-select-right-side">' + html + '</div>');
            this.is_changeCity = true;
        }
        // сброс страны при выборе другого города

    }, {
        key: 'resetCountry',
        value: function resetCountry(ui) {
            this.country_id = null;
            this.region_id = null;
            this.hotel_id = null;
            this.hotels = [];
            this.changeHiddenValue('sfHiddenCountry', '');
            this.changeHiddenValue('sfHiddenRegion', '');
            this.changeHiddenValue('sfHiddenHotel', '');
            this.elems.country.$face.data('value', '');

            var $input = this.elems.country.$face.find('input');
            $input.val('').removeClass('filled');

            this.elems.country.value = null;
            this.elems.country.$facewrap.find('.h-select-reset').hide();

            this.is_changeCity = true;
            this.beforeCountryListShow();
        }
        // изменили страну назначения

    }, {
        key: 'onCountryChange',
        value: function onCountryChange(value, ui, $elem, forceCity) {
            var clickType = 'country';
            // на что нажали
            var countryId = void 0;
            var hotelName = '';
            var regionName = '';

            value = parseInt(value, 10);
            if ($elem.hasClass('h-select-item__region')) {
                clickType = 'region';
                countryId = $elem.data('country');
            } else if ($elem.hasClass('h-select-item__hotel')) {
                clickType = 'hotel';
                countryId = $elem.data('country');
                hotelName = $elem.data('hotel-name');
                regionName = $elem.data('region-name');
            } else {
                // country
                countryId = value;
            }

            var onlyCountry = void 0
              , city = void 0;

            city = this.city_id;
            onlyCountry = true;

            // TODO: check $elem.data('city') === ''
            // смена страны и города
            if ($elem.data('city')) {
                onlyCountry = false;
                city = $elem.data('city');
            } else if (forceCity && city != forceCity) {
                onlyCountry = false;
                city = forceCity;
            }

            switch (clickType) {
            case 'country':
                this.country_id = value;
                this.region_id = null;
                this.hotel_id = null;
                this.hotels = [];
                // select_name = country.name;
                break;
            case 'region':
                this.region_id = value;
                this.country_id = countryId;
                this.hotel_id = null;
                this.hotels = [];
                // select_name = country.name + ', ' +
                // this.regions[this.country_id][this.region_id].name;
                break;
            case 'hotel':
                this.region_id = null;
                this.country_id = countryId;
                this.hotel_id = value;
                this.hotels = [value];
                this.hotel_data[value] = {
                    id: value,
                    name: hotelName,
                    regionName: regionName
                };
                // select_name = hotelName;
                break;
            }
            // ставим новый город
            if (!onlyCountry) {
                this.elems.city.set(city, true);
            }

            ui.$facewrap.find('.h-select-hint').hide();
            // показываем кнопку сброса
            ui.$facewrap.find('.h-select-reset').show();

            this.changeHiddenValue('sfHiddenCountry', this.country_id);
            this.changeHiddenValue('sfHiddenRegion', this.region_id ? this.region_id : '');
            this.changeHiddenValue('sfHiddenHotel', this.hotel_id ? this.hotel_id : '');
            ui.$facewrap.removeClass('h-select-face__error');

            this.renderDestinationLabel();
        }
        // выбор региона
        // устарело

    }, {
        key: 'onRegionClick',
        value: function onRegionClick(value, ui, $elem) {}/*
        this.region_id = value;
        var c = this.countries[this.country_id];
        var rName = c.name + ', '+ this.regions[this.country_id][value];
        if('mini' == this.type) rName = this.regions[this.country_id][value];
        //ui.$face.html('<span>' + rName +'</span>');
        ui.$face.find('input').val(rName);
        this.changeHiddenValue('sfHiddenRegion', value);
        */

        // Выбор отеля для поиска

    }, {
        key: 'onHotelClick',
        value: function onHotelClick(value, ui, $elem) {}
    }, {
        key: 'clearAutoCompleteTimers',
        value: function clearAutoCompleteTimers() {
            if (this.timers.request) {
                this.timers.request.abort();
            }
            if (this.timers.enter) {
                clearInterval(this.timers.enter);
            }
        }
        // ввод в поле "Отель"

    }, {
        key: 'onHotelEnter',
        value: function onHotelEnter(value, $inp) {
            value = value.trim();
            if (value === '') {
                this.clearAutoCompleteTimers();
                this.showExtendCountryForm();
                return;
            }

            this._searchHotels(value, $inp, true);
        }
        // ввод в поле "Страна, курорт или отель"
        // рисуем 2 списка: 1) из стран и курортов 2) из отелей

    }, {
        key: 'onDestinationEnter',
        value: function onDestinationEnter(value, $inp) {
            value = value.trim();
            if (value === '') {
                this.clearAutoCompleteTimers();
                this.beforeCountryListShow();
                return;
            }

            this._searchDestination(value, $inp);
        }
    }, {
        key: 'getAutocompleteResultContainer',
        value: function getAutocompleteResultContainer(hotelOnlyAutoComplete) {
            var cssClass = hotelOnlyAutoComplete ? this.hotelAutocompleteCssClass : this.destinationAutocompleteCssClass;
            return this.elems.country.$items.find('.' + cssClass);
        }
        // use with debounce

    }, {
        key: '_searchDestination',
        value: function _searchDestination(value, $inp) {
            // Подходящие страны и регионы
            var destinations = this.getCountryAndRegionItemsByTerm(value);
            var countryItemsHtml = '';
            var regionItemsHtml = '';
            if (destinations.countries.length) {
                countryItemsHtml = this.generateCleverList(destinations.countries);
            }
            if (destinations.regions.length) {
                regionItemsHtml = this.generateCleverList(destinations.regions);
            }

            var html = "<div class='" + this.destinationAutocompleteCssClass + "'>" + countryItemsHtml + regionItemsHtml + '</div>';
            // Совпадения по странам и регионам
            this.elems.country.$items.html(html);
            // Поиск отелей
            this._searchHotels(value, $inp, false);
        }
        // use with debounce

    }, {
        key: '_searchHotels',
        value: function _searchHotels(value, $inp, hotelOnlyAutoComplete) {
            if (typeof hotelOnlyAutoComplete === 'undefined' || hotelOnlyAutoComplete && this.country_id === null) {
                return;
            }
            var self = this;

            var hotelLoading = "<div class='cleverList_hotel_loading'>Идет поиск отелей...</div>";
            var $resultContainer = this.getAutocompleteResultContainer(hotelOnlyAutoComplete);

            var requestUrl = '/tours/hotel/findHotelByName?case=1&term=' + encodeURIComponent(value);
            var requestParams = {
                type: 'hotel',
                mode: 'mainform',
                limit: 10
            };
            if (hotelOnlyAutoComplete) {
                requestParams.country = this.country_id;
                requestParams.limit = 5;
                $resultContainer.html(hotelLoading).removeClass('hidden');
            } else {
                $resultContainer.append(hotelLoading);
            }

            this.is_changeCity = true;
            this.clearAutoCompleteTimers();
            this.timers.enter = setTimeout(function() {
                self.timers.request = $.getJSON(requestUrl, requestParams, function(data) {
                    $inp.removeClass('h-select-hotel-name__loading');
                    self.showDropDownHotelList(data, hotelOnlyAutoComplete);
                });
            }, this.debounceInputTime);
        }
    }, {
        key: 'getSortedDeparts',
        value: function getSortedDeparts(departs) {
            var self = this;
            var result = []
              , i = void 0
              , cityId = void 0;
            if (typeof departs[self.city_id] !== 'undefined') {
                result.push(self.city_id);
            }

            for (i in departs) {
                cityId = departs[i];
                if (cityId == self.city_id) {
                    continue;
                }
                result.push(cityId);
            }

            return result;
        }
    }, {
        key: 'getCountryAndRegionItemsByTerm',
        value: function getCountryAndRegionItemsByTerm(value) {
            var countryId = void 0
              , departCities = void 0
              , country = void 0
              , haveDepart = void 0
              , i = void 0
              , cityId = void 0
              , cleverRow = void 0
              , listWithDepart = {
                countries: [],
                regions: []
            }
              , list = {
                countries: [],
                regions: []
            }
              , regionId = void 0
              , region = void 0;

            // составляем список из стран и курортов, которые подходят под value
            for (countryId in this.countries) {
                if (!this.countries.hasOwnProperty(countryId)) {
                    continue;
                }
                country = this.countries[countryId];
                departCities = this.getSortedDeparts(country.departCities);
                haveDepart = departCities.indexOf(this.city_id) !== -1;
                if (haveDepart) {
                    departCities = [this.city_id];
                }
                if (this.compare(country.name, value)) {
                    for (i = 0; i < departCities.length; i++) {
                        cityId = departCities[i];
                        cleverRow = this.getCleverListRow({
                            type: 'country',
                            countryId: country.id,
                            countryName: country.name,
                            countryNameEn: country.name_en,
                            isDepart: haveDepart,
                            departCityId: cityId,
                            departCityFrom: this.data[cityId].name2,
                            sort: 0 // country.sort,
                        });

                        if (haveDepart) {
                            listWithDepart.countries.push(cleverRow);
                        } else {
                            list.countries.push(cleverRow);
                        }
                    }
                }
                // бежим по регионам каждой страны
                if (this.regions.hasOwnProperty(countryId)) {
                    for (regionId in this.regions[countryId]) {
                        if (!this.regions[countryId].hasOwnProperty(regionId)) {
                            continue;
                        }
                        region = this.regions[countryId][regionId];
                        if (this.compare(region.name, value)) {
                            for (i = 0; i < departCities.length; i++) {
                                cityId = departCities[i];
                                cleverRow = this.getCleverListRow({
                                    type: 'region',
                                    countryId: country.id,
                                    countryName: country.name,
                                    countryNameEn: country.name_en,
                                    regionId: regionId,
                                    regionName: region.name,
                                    isDepart: false,
                                    departCityId: cityId,
                                    departCityFrom: this.data[cityId].name2,
                                    sort: 0 // country.sort,
                                });

                                if (haveDepart) {
                                    listWithDepart.regions.push(cleverRow);
                                } else {
                                    list.regions.push(cleverRow);
                                }
                            }
                        }
                    }
                }
            }

            listWithDepart.countries.sort(function(a, b) {
                return a.sort - b.sort;
            });
            list.countries.sort(function(a, b) {
                return a.sort - b.sort;
            });
            listWithDepart.regions.sort(function(a, b) {
                return a.sort - b.sort;
            });
            list.regions.sort(function(a, b) {
                return a.sort - b.sort;
            });

            return {
                countries: listWithDepart.countries.concat(list.countries),
                regions: listWithDepart.regions.concat(list.regions)
            };
        }
        // список стран/курортов, отелей, подходящих под введенный пользователем запрос

    }, {
        key: 'generateCleverList',
        value: function generateCleverList(list) {
            var html = ''
              , cleverItem = void 0
              , self = this;

            list.forEach(function(cleverItem) {
                switch (cleverItem.type) {
                case 'country':
                    html += self.getCountryItemHTML(cleverItem, cleverItem.countryId == this.country_id);
                    break;
                case 'region':
                    html += self.getRegionItemHTML(cleverItem, cleverItem.regionId == this.region_id);
                    break;
                case 'hotel':
                    html += self.getHotelItemHTML(cleverItem);
                    break;
                default:
                    return;
                    break;
                }
            });

            return html;
        }
        // проверка на вхождение
        // TODO добавить проверку на транслит

    }, {
        key: 'compare',
        value: function compare(subject, value) {
            return subject.toLowerCase().indexOf(value.toLowerCase()) !== -1;
        }
        // список отелей в выпадающем списка выбора "Где отдохнуть"

    }, {
        key: 'showDropDownHotelList',
        value: function showDropDownHotelList(data, hotelOnlyAutoComplete) {
            if (!this.elems.country.isShown()) {
                return;
            }

            var $resultContainer = this.getAutocompleteResultContainer(hotelOnlyAutoComplete);

            var listByCountry = {}
              , itemKey = void 0
              , itemCounter = 0
              , that = this
              , isDepart = void 0
              , html = ''
              , cleverItem = void 0;

            data.hotels.forEach(function(item) {
                if (!that.countries.hasOwnProperty(item.country_id)) {
                    return;
                }
                isDepart = that.data[that.city_id].countries.hasOwnProperty(item.country_id);

                cleverItem = that.getCleverListRow({
                    type: 'hotel',
                    countryId: item.country_id,
                    countryName: hotelOnlyAutoComplete ? '' : item.countryName,
                    hotelId: item.id,
                    hotelName: item.hotelName,
                    regionName: item.regionName,
                    isDepart: isDepart// есть ли вылет из текущего города вылета
                    // departCityId: isDepart ? null : that.countries[item.item.country_id].city_id,
                });
                itemKey = 'country_' + cleverItem.countryId;
                if (!listByCountry.hasOwnProperty(itemKey)) {
                    listByCountry[itemKey] = [];
                }
                listByCountry[itemKey].push(cleverItem);
                itemCounter++;
            });

            $resultContainer.find('.cleverList_hotel_loading, .cleverList_hotels_empty, .cleverList_hotels, .cleverList_hotel_title').remove();
            if (itemCounter === 0) {
                if (!$resultContainer.find('.h-select-item').length) {
                    html = hotTemplate("<div class='cleverList_hotels_empty'>По запросу <b>{{term}}</b> ничего не найдено." + ' Попробуйте изменить запрос</div>', {
                        term: data.term
                    });
                }
            } else {
                var list = []
                  , i = void 0;
                for (itemKey in listByCountry) {
                    for (i in listByCountry[itemKey]) {
                        list.push(listByCountry[itemKey][i]);
                    }
                }

                // html += "<h4 class='h-select-extend-title cleverList_hotel_title'>Отели</h4>";
                html = "<div class='clever-list-hotels'>" + this.generateCleverList(list) + '</div>';
            }
            $resultContainer.append(html);
        }
    }, {
        key: 'getHotelItemHTML',
        value: function getHotelItemHTML(cleverItem, selected) {
            var countryHint = '<span class="country-hint">(' + cleverItem.regionName + (cleverItem.countryName !== '' ? ', ' + cleverItem.countryName : '') + ')</span>';
            return '<div class="h-select-item  h-select-item__hotel_m h-select-item__hotel" \
                data-value="' + cleverItem.hotelId + '" data-country="' + cleverItem.countryId + '" \
                data-hotel-name="' + cleverItem.hotelName + '" \
                data-region-name="' + cleverItem.regionName + '">\
            <div class="h-select-item-text">' + cleverItem.hotelName + ' ' + countryHint + '</div>\
            <div class="clearfix"></div>\
        </div>';
        }
    }, {
        key: 'getRegionItemHTML',
        value: function getRegionItemHTML(cleverItem, selected) {
            var cssClass = selected ? ' h-select-item__active' : '';
            var value = cleverItem.regionId;
            if (cleverItem.regionId === null) {
                cssClass += ' h-select-region-all';
                value = cleverItem.countryId;
            } else {
                cssClass += ' h-select-item__region';
            }
            var departCityFrom = cleverItem.departCityFrom !== '' ? ' из ' + cleverItem.departCityFrom : '';
            var countryHint = cleverItem.countryName !== '' ? ', <span class="country-hint">' + cleverItem.countryName + departCityFrom + '</span>' : '';

            return '<div class="h-select-region-wrap">' + '<div class="h-select-item ' + cssClass + '"' + ' data-country="' + cleverItem.countryId + '" data-value="' + value + '"' + ' data-city="' + (cleverItem.departCityId !== null ? cleverItem.departCityId : '') + '">' + cleverItem.regionName + countryHint + '</div>' + '</div>';
        }
    }, {
        key: 'getCountryItemHTML',
        value: function getCountryItemHTML(cleverItem, selected) {
            var dataDepartCity = cleverItem.departCityId !== null ? 'data-city="' + cleverItem.departCityId + '"' : '';
            var departCityHint = cleverItem.departCityFrom !== '' ? ' <span class="country-hint">(Из ' + cleverItem.departCityFrom + ')</span>' : '';

            return '<div class="h-select-item ' + (selected ? 'h-select-item__active' : '') + '" ' + 'data-value="' + cleverItem.countryId + '" ' + dataDepartCity + '>\
            <div class="h-select-item-text">' + cleverItem.countryName + departCityHint + '</div>\
            <div class="clearfix"></div>\
        </div>';
        }
        // рендеринг списка стран

    }, {
        key: 'beforeCountryListShow',
        value: function beforeCountryListShow() {
            if (!this.is_changeCity) {
                return;
            }

            this.renderCountryOptions();
            this.showExtendCountryForm();
            /* if (this.hotel_id) {
                this.elems.country.$items.html(
                    '<div class="' + this.destinationAutocompleteCssClass + '">' + this.getCurrentHotelOption() + '</div>'
                );
            } else {
                this.renderCountryOptions();
                this.showExtendCountryForm();
            }*/
            this.is_changeCity = false;
        }
    }, {
        key: 'getCountriesListHTML',
        value: function getCountriesListHTML(countries, order) {}
    }, {
        key: 'getOtherCititesData',
        value: function getOtherCititesData() {
            var cityId = void 0;
            var citiesData = [];
            var preferCity = this.preferCities.hasOwnProperty(this.city_id) ? this.preferCities[this.city_id] : null;
            for (cityId in this.data) {
                cityId = parseInt(cityId, 10);
                if (!this.data.hasOwnProperty(cityId)) {
                    continue;
                }
                if (this.city_id === cityId) {
                    continue;
                }
                if (preferCity && cityId === preferCity) {
                    citiesData.unshift(this.data[cityId]);
                } else {
                    citiesData.push(this.data[cityId]);
                }
            }

            return citiesData;
        }
    }, {
        key: 'getDirectionCountriesHTML',
        value: function getDirectionCountriesHTML(cityData, order, skip, limit) {
            skip = skip || {};
            limit = limit || 0;

            var isCurrentCity = cityData.id == this.city_id;
            var countryId = void 0
              , country = void 0
              , k = void 0
              , selected = void 0
              , item = void 0
              , params = void 0
              , itemCounter = 0
              , html = ''
              , renderedCountries = {}
              , countries = cityData.countries;

            for (k in order) {
                countryId = order[k];
                if (skip[countryId] === 1) {
                    continue;
                }
                country = countries[countryId];
                params = {
                    type: 'country',
                    countryId: countryId,
                    countryName: country.name,
                    countryNameEn: country.name_en,
                    departCityId: cityData.id,
                    departCityFrom: ''
                };
                if (!isCurrentCity) {
                    // Для направления не из текущего города
                    params.departCityFrom = cityData.name2;
                    selected = false;
                } else {
                    selected = this.country_id == countryId;
                }

                item = this.getCleverListRow(params);
                html += this.getCountryItemHTML(item, selected);
                renderedCountries[countryId] = 1;
                itemCounter++;
                if (itemCounter === limit) {
                    break;
                }
            }

            return {
                html: html,
                renderedCountries: renderedCountries
            };
        }
    }, {
        key: 'getDirectionCountriesSplitHTML',
        value: function getDirectionCountriesSplitHTML(cityData, split) {
            split = split || false;
            var countriesOrderByPos = cityData.countriesOrderByPos
              , countriesOrderByName = cityData.countriesOrderByName
              , popularCountriesHtml = ''
              , otherCountries = void 0;

            if (split) {
                var popularCountries = this.getDirectionCountriesHTML(cityData, countriesOrderByPos, {}, 6);
                popularCountriesHtml = popularCountries.html;
                otherCountries = this.getDirectionCountriesHTML(cityData, countriesOrderByName, popularCountries.renderedCountries);
            } else {
                otherCountries = this.getDirectionCountriesHTML(cityData, countriesOrderByPos);
            }

            return {
                popular: popularCountriesHtml,
                other: otherCountries.html
            };
        }
    }, {
        key: 'createDataFromCountrySelectHotelsSearch',
        value: function createDataFromCountrySelectHotelsSearch() {
            // нужны копии чтобы не изменить оригинал
            var data = Object.assign({
                countries: Object.assign({}, this.data[1].countries),
                countriesOrderByPos: Object.assign({}, this.data[1].countriesOrderByPos),
                countriesOrderByName: {}
            });
            // для начала возьмем все по алмате

            var maxPosition = 0;
            // все страны которых не будет в countriesOrderByPos будем писать от максмальной
            for (var country in data.countriesOrderByPos) {
                if (data.countriesOrderByPos.hasOwnProperty(country)) {
                    maxPosition = Math.max(maxPosition, data.countriesOrderByPos[country]);
                }
            }

            var countriesArr = [];
            for (var id in this.countries) {
                if (this.countries.hasOwnProperty(id)) {
                    var _country = this.countries[id];
                    countriesArr.push(_country);
                    if (!data.countries.hasOwnProperty(id)) {
                        // добавим если нет такой страны
                        data.countriesOrderByPos[_country.code] = ++maxPosition;
                        data.countries[id] = {
                            city_id: 1,
                            code: _country.code,
                            country_id: _country.id,
                            minPrice: 0,
                            name: _country.name,
                            name2: _country.name2,
                            name3: _country.name3,
                            name_en: _country.name_en,
                            pos: maxPosition,
                            to: _country.to
                        };
                    }
                }
            }

            countriesArr.sort(function(a, b) {
                if (a.name === b.name) {
                    return 0;
                }
                return a.name < b.name ? -1 : 1;
            });
            countriesArr.forEach(function(country, index) {
                data.countriesOrderByName[country.code] = country.id;
            });

            this.hotelsSearchDirectionsData = data;
        }
    }, {
        key: 'renderCountryOptions',
        value: function renderCountryOptions() {
            // сначала рисуем страны для вылета из текущего города
            var country = void 0
              , countryId = void 0
              , item = void 0
              , html = '';

            // html += '<div class="h-select-group h-select-group__first"></div>';

            // Направление из текущего города вылета
            var countriesToRender = [];
            if (this.mode === SEARCH_TYPE_HOTELS) {
                countriesToRender = this.hotelsSearchDirectionsData;
            } else {
                countriesToRender = this.data[this.city_id];
            }
            var countries = this.getDirectionCountriesSplitHTML(countriesToRender, true);

            html += '<div class="h-select-group countries-group">Популярные направления:</div>' + countries.popular;
            if (countries.other !== '') {
                html += '<div class="h-select-group countries-group">Остальные:</div>' + countries.other;
            }

            if (this.mode === SEARCH_TYPE_TOURS) {
                var citiesData = this.getOtherCititesData()
                  , i = void 0
                  , cityInfo = void 0;
                for (i = 0; i < citiesData.length; i++) {
                    cityInfo = citiesData[i];
                    countries = this.getDirectionCountriesSplitHTML(cityInfo, false);
                    if (countries.other !== '') {
                        html += '<div class="h-select-group depart-city-group">Вылет из ' + cityInfo.name2 + '</div>';
                        html += countries.other;
                    }
                }
            }
            /*
            var countriesOrderByPos,
                countriesOrderByName;
            countriesOrderByPos = this.data[this.city_id].countriesOrderByPos;
            countriesOrderByName = this.data[this.city_id].countriesOrderByName;
            for (k in countriesOrderByPos) {
                countryId = countriesOrderByPos[k];
                country = countries[countryId];
                selected = this.country_id == countryId;
                 item = this.getCleverListRow({
                    type: 'country',
                    countryId: countryId,
                    countryName: country.name,
                    countryNameEn: country.name_en,
                    departCityId: null,
                });
                html += this.getCountryItemHTML(item, selected);
            }
             var j, h, i;
            var cityId;
            var cityInfo;
            for (i = 0; i < citiesData.length; i++) {
                cityInfo = citiesData[i];
                cityId = parseInt(cityInfo.id, 10);
                h = '';
                for (j in cityInfo.countriesOrderByPos) { // j - country.name_en
                    countryId = cityInfo.countriesOrderByPos[j];
                    country = cityInfo.countries[countryId];
                    item = this.getCleverListRow({
                        type: 'country',
                        countryId: countryId,
                        countryName: country.name,
                        countryNameEn: country.name_en,
                        departCityId: cityId,
                        departCityFrom: cityInfo.name2,
                    });
                    h += this.getCountryItemHTML(item, false);
                }
                if ('' !== h) {
                    html += hotTemplate(
                        groupTemplate,
                        {groupType: 'depart-city', label: 'Вылет из ' + cityInfo.name2}
                    );
                    html += h;
                }
            }
            */

            this.elems.country.$items.html('<div class="clever-list-countries h-select-left-side">' + html + '</div>');
        }
        // показываем курорты по выбранной стране

    }, {
        key: 'getRegionsHtml',
        value: function getRegionsHtml() {
            if (this.country_id == null) {
                return;
            }

            var regions = this.regions[this.country_id]
              , k = void 0
              , html = ''
              , cls = void 0
              , regionsArr = []
              , selected = void 0
              , cleverItem = void 0;
            var r = void 0
              , c = this.countries[this.country_id];
            var f = false;
            for (k in regions) {
                // k - region_id
                regionsArr.push({
                    id: k,
                    name: regions[k].name,
                    tours_count: parseInt(regions[k].tours_count, 10)
                });
            }
            regionsArr.sort(function(a, b) {
                return b.tours_count - a.tours_count;
            });

            for (k in regionsArr) {
                // k - region_id
                r = regionsArr[k];
                cls = '';
                selected = this.region_id == r.id;
                if (selected) {
                    f = true;
                }

                cleverItem = this.getCleverListRow({
                    type: 'region',
                    countryId: this.country_id,
                    countryName: '',
                    // c.name,
                    regionId: r.id,
                    regionName: r.name
                });

                html += this.getRegionItemHTML(cleverItem, selected);
            }

            selected = this.region_id == null;
            cleverItem = this.getCleverListRow({
                type: 'region',
                countryId: this.country_id,
                countryName: '',
                regionName: 'Все регионы'
            });
            var activeClass = this.region_id == null ? 'h-select-item__active' : '';
            html = '<h4 class="h-select-extend-title">Выберите регион:</h4>' + '<div class="h-select-regions">' + this.getRegionItemHTML(cleverItem, selected) + html + '</div>';

            this.is_changeCity = true;
            return html;
        }
    }, {
        key: 'getCurrentHotelOption',
        value: function getCurrentHotelOption() {
            var country = this.countries[this.country_id];
            var hotel = this.hotel_data[this.hotel_id];
            var cleverItem = this.getCleverListRow({
                type: 'hotel',
                countryId: country.id,
                countryName: country.name,
                hotelId: this.hotel_id,
                hotelName: hotel.name,
                regionName: hotel.regionName
            });

            return this.getHotelItemHTML(cleverItem, true);
        }
    }, {
        key: 'renderRegionOptions',
        value: function renderRegionOptions() {
            this.elems.country.$items.html(this.getRegionsHtml());
            this.is_changeCity = true;
        }
        // установка значения для формы перехода

    }, {
        key: 'changeHiddenValue',
        value: function changeHiddenValue(field, value) {
            $('#' + field).val(value);
        }
        // сброс дней в datepicker-е

    }, {
        key: 'resetDatepickerDate',
        value: function resetDatepickerDate() {}/* body... */

        // сброс поля ночей

    }, {
        key: 'resetNights',
        value: function resetNights() {
            var f = false;
            if (this.city_id == null || this.country_id == null) {
                f = true;
            }

            var nValue = [];
            var curN = void 0;
            var nights = void 0;

            var cityData = this.data[this.city_id];
            var direction = cityData && cityData.countries[this.country_id] ? cityData.countries[this.country_id] : null;
            // !this.data[this.city_id].countries[this.country_id].days
            if (!f && direction !== null && direction.days) {
                nights = this.data[this.city_id].countries[this.country_id].days;
            } else {
                nights = [7, 8, 9, 10, 11, 12, 13, 14];
            }
            curN = nights[0];
            switch (nights.length) {
            case 2:
                nValue = [nights[0], nights[1]];
                break;
            case 1:
                nValue = [nights[0], nights[0]];
                break;
            default:
                // >=3
                nValue = [nights[0], nights[2]];
                curN = nights[1];
                for (var i = 0; i < nights.length; i++) {
                    nights[i] = parseInt(nights[i], 10);
                    if (nights[i] === this.nights[0]) {
                        // если нашли нижнюю границу прежнего диапазона в новом
                        if (i + 2 <= nights.length) {
                            nValue = [nights[i], nights[i + 2]];
                            curN = nights[i + 1];
                        } else if (i + 1 <= nights.length) {
                            nValue = [nights[i], nights[i + 1]];
                            curN = nights[i + 1];
                        } else if (i - 2 > 0) {
                            nValue = [nights[i - 2], nights[i]];
                            curN = nights[i];
                        } else if (i - 1 > 0) {
                            nValue = [nights[i - 1], nights[i]];
                            curN = nights[i];
                        }
                    }
                }
                break;
            }

            var fa = 0;
            var f = 0;
            var day = void 0;
            /* body... */
            var template = "<div class='h-select-item {{active}}' data-value='{{day}}'>\
						{{days_place}}\
					</div>";
            var html = void 0;
            var content = '';
            var text = void 0;
            for (var k in nights) {
                html = template;
                day = nights[k];
                text = '';
                if (nValue.indexOf(day) >= 0) {
                    // -1, если не найдено, если чо
                    text = 'h-select-item__hovered_ex';
                }

                text = '';
                if (!fa && day == curN) {
                    text = 'h-select-item__active';
                    fa = 1;
                }
                if (!f) {
                    f = day;
                }
                html = html.split('{{active}}').join(text);
                html = html.split('{{day}}').join(day);
                html = html.split('{{days_place}}').join(day + ' ' + getnoun(day, 'день', 'дня', 'дней'));
                content += html;
            }

            this.elems.nights.$items.html(content);
            this.elems.nights.set(curN);
        }
        // отмечаем дни, для которых есть цены

    }, {
        key: 'dateBeforeShowDay',
        value: function dateBeforeShowDay(G) {
            if (this.city_id == null || this.country_id == null) {
                return [true, ''];
            }
            var cl = 'non-exist-prices';
            try {
                var prices = this.data[this.city_id].countries[this.country_id].prices;
                var k = 'd' + [G.getDate(), G.getMonth(), G.getFullYear()].join('.');
                if (k in prices) {
                    cl = 'exist-prices';
                }
            } catch (e) {}
            return [true, cl];
        }
        // выбор даты

    }, {
        key: 'onSelectDate',
        value: function onSelectDate(date, inst, $elem) {
            this.date = moment.isMoment(date) ? date : moment([inst.selectedYear, inst.selectedMonth, parseInt(inst.selectedDay)]);
            this.refreshDateField();
            this.elems.date.hide();
            var nDate = this.date.clone();
            this.changeHiddenValue('sfHiddenDateFrom', nDate.format('D.M.YYYY'));
            this.updateDesc();
        }
    }, {
        key: 'refreshDateField',
        value: function refreshDateField($el) {
            var dateText = this.date.format('D.MM');
            if (this.dateDelta) {
                dateText += ' ± 3 дня';
            }
            $('#w-st-date .h-select-face').html(dateText);
        }
        // обновление текста в кратком описании поиска

    }, {
        key: 'updateDesc',
        value: function updateDesc() {
            if (this.type != 'mini') {
                return;
            }

            var countryText = '';
            if (this.country_id) {
                countryText = this.data[this.city_id].countries[this.country_id].name;
                if (this.region_id) {
                    countryText += ', ' + this.regions[this.country_id][this.region_id].name;
                }
                if (this.hotels.length == 1 && this.hotel_data.hasOwnProperty(this.hotels[0])) {
                    countryText = this.hotel_data[this.hotels[0]].name + ', ' + countryText;
                }
            }
            var text = {
                city: this.data[this.city_id].name,
                country: countryText,
                date: '',
                nights: this.nights[0] + (this.nights[0] !== this.nights[1] ? '-' + this.nights[1] : '') + ' ' + getnoun(this.nights[1], 'день', 'дня', 'дней'),
                peoples: this.adult + ' ' + getnoun(this.adult, 'взрослый', 'взрослых', 'взрослых') + (this.child > 0 ? ', ' + this.child + ' ' + getnoun(this.child, 'ребенок', 'ребенка', 'детей') : '')
            };

            var nDate = this.date.clone();
            var toDate = this.date.clone();
            var now = moment();
            if (this.dateDelta) {
                nDate.subtract(this.delta, 'd');
                if (nDate.toDate().valueOf() < now.toDate().valueOf()) {
                    nDate = now.clone();
                }
                toDate.add(this.delta, 'd');
                if (nDate.format('M.YYYY') == toDate.format('M.YYYY')) {
                    text.date = 'с ' + nDate.format('D') + ' по ' + $.datepicker.formatDate('d MM', toDate.toDate(), {});
                } else {
                    text.date = 'с ' + $.datepicker.formatDate('d MM', nDate.toDate(), {}) + ' по ' + $.datepicker.formatDate('d MM', toDate.toDate(), {});
                }
            } else {
                text.date = $.datepicker.formatDate('d MM', this.date.toDate(), {});
            }

            $('.w-start-city span').text(text.city);
            $('.w-start-country span').text(text.country);
            $('.w-start-calendar').text(text.date);
            $('.w-start-nights').text(text.nights);
            $('.w-start-peoples span').text(text.peoples);
        }
        // отправка данных
        /**
         *
         * @param forcedForwarding принудительное отключение отправки на другую страницу
         * @returns {{returnValue: boolean, success: *}}
         */

    }, {
        key: 'onSubmit',
        value: function onSubmit() {
            var forcedForwarding = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            // собираем значения
            var dd = this.checkParams();
            var params = dd.params;
            var res = dd.f;

            if (this.debug) {
                console.log(params);
            }

            // если не надо отправлять на др. страницу
            if (!this.forwarding || forcedForwarding === true) {
                if (res) {
                    this.startSearch({}, true);
                }
                res = false;
            }

            return res;
        }
    }, {
        key: 'checkParams',
        value: function checkParams(f) {
            var res = true;
            // собираем значения
            var params = {};
            params.country = this.country_id;
            params.region = this.region_id;
            params.stars = this.stars ? this.stars : '';
            params.adult = this.adult ? this.adult : 2;
            params.child = this.child ? this.child : 0;
            params.childAges = this.child ? this.ages : [];
            params.hotelType = '';
            params.hotels = this.hotels;
            params.priceMax = '';
            params.priceMin = '';
            params.groupResultMode = 1;

            var onlyHotels = this.mode === SEARCH_TYPE_HOTELS;

            if (onlyHotels) {
                params.dateFrom = this.dateFrom.format('DD.MM.YYYY');
                params.dateTo = this.dateTo.format('DD.MM.YYYY');
                params.nightsFrom = 1;
                params.nightsTo = 1;
            } else {
                params.departCity = this.city_id;
                // в nights у нас ДНИ !!!
                params.nightsFrom = this.nights[0] - 1;
                params.nightsTo = this.nights[1] - 1;

                var dd = this.createDateRange(this.date, this.dateDelta);
                params.dateFrom = dd.dateFrom.format('DD.MM.YYYY');
                params.dateTo = dd.dateTo.format('DD.MM.YYYY');
            }

            // проверяем значения
            // страна
            if (params.country == null) {
                res = false;
                this.elems.country.$facewrap.addClass('h-select-face__error');
                var $title = this.elems.country.$face;
                $title.tooltip({
                    trigger: 'manual',
                    placement: 'top',
                    title: 'Выберите куда вы хотите поехать'
                }).tooltip('show');
                setTimeout(function() {
                    $title.tooltip('hide');
                }, 2500);
            }

            // кол-во и возраст спиногрызов
            if (params.child > 0) {
                for (var i = 0; i < params.child; i++) {
                    if (typeof params.childAges[i] === 'undefined') {
                        res = false;
                        this.elems.peoples.$facewrap.addClass('h-select-face__error');
                        if (this.elems.ages[i]) {
                            this.elems.ages[i].addClass('danger');
                        }
                    }
                }
            }

            return {
                params: params,
                f: res,
                errors: {}
            };
        }
    }, {
        key: 'createDateRange',
        value: function createDateRange(momentDate, dateDelta) {
            var params = {};
            params.dateFrom = momentDate.clone();
            params.dateTo = momentDate.clone();
            if (dateDelta) {
                var toDate = momentDate.clone();
                var nDate = momentDate.clone();
                // minus
                nDate.subtract(this.delta, 'd');
                // проверяем, чтобы вычет не ушел в прошлое
                var now = moment();
                var today = moment([now.year(), now.month(), now.date()]);
                if (today.unix() > nDate.unix()) {
                    nDate = today.clone();
                }
                toDate.add(this.delta, 'd');
                if (toDate.diff(nDate) < 0) {
                    var t = nDate.clone();
                    nDate = toDate.clone();
                    toDate = t.clone();
                }

                params.dateFrom = nDate.clone();
                params.dateTo = toDate.clone();
            }

            return params;
        }
        // обновление параметров поиска в адресной строке

    }, {
        key: 'refreshQuery',
        value: function refreshQuery() {
            var params = {};
            params.region = this.region_id ? this.region_id : '';
            params.country = this.country_id;
            params.stars = this.stars ? this.stars : 'any';
            params.adult = this.adult ? this.adult : 2;
            params.child = this.child ? this.child : 0;
            params.hotel = this.hotels.length ? this.hotels.join(',') : '';
            params.childAges = this.ages.join(',');
            params.search = 1;
            params.groupResultByHotels = 1;
            params.bank = this.element.find('form [name="bank"]').val();
            if (typeof this.splitRooms === 'boolean') {
                params.splitRooms = this.splitRooms ? 1 : 0;
            } else {
                params.splitRooms = String(this.splitRooms) === '1' ? 1 : 0;
            }

            if (this.mode === SEARCH_TYPE_HOTELS) {
                params.hotelsSearch = 1;
                params.dateTo = this.dateTo.format('DD.MM.YYYY');
                params.dateFrom = this.dateFrom.format('DD.MM.YYYY');
            } else {
                params.delta = this.dateDelta ? 1 : 0;
                params.departCity = this.city_id;
                params.nightsFrom = this.nights[0];
                params.nightsTo = this.nights[1];
                params.dateFrom = this.date.format('DD.MM.YYYY');
            }

            var href = '/findtours?'
              , t = ''
              , k = void 0;
            for (k in params) {
                href += t + k + '=' + params[k];
                t = '&';
            }
            if (this.useHistory) {
                history.pushState(params, 'Подбор тура из Астаны и Алматы, поиск тура онлайн', href);
            }

            window.brxUserActivity.saveSearch(location.origin + href, this.createHistoryDesc(params));

            this.refreshHistory(params);
        }
        // инициализация истории: смотрим был ли поиск ранее и выводим его

    }, {
        key: '_initializeHistory',
        value: function _initializeHistory() {
            if (!this.historyList) {
                return;
            }
            if (!isLocalStorageNameSupported()) {
                return;
            }
            var ls = window.localStorage;
            var sKeys = {}
              , html = '';
            var k = ls.getItem('search');
            if (k != null) {
                sKeys = JSON.parse(k);
            }

            for (k in sKeys) {
                html += this.createHistoryRow(sKeys[k]);
            }
            if (html === '') {
                return;
            }
            $('.hotHistory a').remove();
            // очищаем поле
            $('.hotHistory span').after(html);
            $('.hotHistory').show();
        }
    }, {
        key: 'createHistoryRow',
        value: function createHistoryRow(params) {
            if (!this.countries.hasOwnProperty(params.country)) {
                return '';
            }
            var html = this.countries[params.country].name;
            var nDate = moment(params.dateFrom, 'DD.MM.YYYY');
            // var toDate = moment(params.dateTo, 'DD.MM.YYYY');
            var dd = this.createDateRange(nDate, params.delta);
            nDate = dd.dateFrom.clone();
            var toDate = dd.dateTo.clone();
            if (nDate.unix() === toDate.unix()) {
                html += ' на ' + $.datepicker.formatDate('d MM', nDate.toDate(), {});
            } else if (nDate.format('M.YYYY') === toDate.format('M.YYYY')) {
                html += ' с ' + nDate.format('D') + ' по ' + $.datepicker.formatDate('d MM', toDate.toDate(), {});
            } else {
                html += ' с ' + $.datepicker.formatDate('d MM', nDate.toDate(), {}) + ' по ' + $.datepicker.formatDate('d MM', toDate.toDate(), {});
            }

            var href = '/findtours?'
              , t = ''
              , k = void 0;
            for (k in params) {
                href += t + k + '=' + params[k];
                t = '&';
            }

            return '<a href="' + href + '" class="history-item">' + html + '</a>';
        }
    }, {
        key: 'createHistoryDesc',
        value: function createHistoryDesc(params) {
            if (!this.countries.hasOwnProperty(params.country) || !this.data.hasOwnProperty(params.departCity)) {
                return '';
            }
            var html = this.countries[params.country].name;
            html += ' из ' + this.data[params.departCity].name2;
            var nDate = moment(params.dateFrom, 'DD.MM.YYYY');
            // var toDate = moment(params.dateTo, 'DD.MM.YYYY');
            var dd = this.createDateRange(nDate, params.delta);
            nDate = dd.dateFrom.clone();
            var toDate = dd.dateTo.clone();
            if (nDate.unix() === toDate.unix()) {
                html += ' на ' + $.datepicker.formatDate('d MM', nDate.toDate(), {});
            } else if (nDate.format('M.YYYY') === toDate.format('M.YYYY')) {
                html += ' с ' + nDate.format('D') + ' по ' + $.datepicker.formatDate('d MM', toDate.toDate(), {});
            } else {
                html += ' с ' + $.datepicker.formatDate('d MM', nDate.toDate(), {}) + ' по ' + $.datepicker.formatDate('d MM', toDate.toDate(), {});
            }

            html += ', на ' + params.nightsFrom + '-' + params.nightsTo + ' дней';
            html += ', ' + params.adult + 'взр';
            if (params.child > 0) {
                html += '+' + params.child + 'реб(';
                var ages = [params.ch1, params.ch2]
                  , t = '';
                ages.forEach(function(age) {
                    if (age > 0) {
                        html += t + age;
                        t = ',';
                    }
                });
                html += ')';
            }

            return html;
        }
        // обновление поля "недавно искали"

    }, {
        key: 'refreshHistory',
        value: function refreshHistory(params) {
            if (!this.historyList) {
                return;
            }
            if (!isLocalStorageNameSupported()) {
                return;
            }
            var ins = true;
            var ls = window.localStorage;
            // hex_md5(hash_st);
            // проверяем был ли такой поиск
            var hash = this.generateHistoryHash(params);
            this._initializeHistory();
            // перерисовываем элементы
            var k = ls.getItem('search')
              , sKeys = {};
            if (k != null) {
                sKeys = JSON.parse(k);
            }

            var kk = void 0
              , item = void 0
              , hh = void 0;
            for (kk in sKeys) {
                item = sKeys[kk];
                hh = this.generateHistoryHash(item);
                if (hh === hash) {
                    ins = false;
                    // поменять местами новый поиск и старый - удаляем старый, в начало дописываем новый
                    delete sKeys[kk];

                    sKeys = this.addHistoryElem(sKeys, item);
                    ls.setItem('search', JSON.stringify(sKeys));
                    break;
                }
            }

            if (ins) {
                // пишем в localstorage
                sKeys = this.addHistoryElem(sKeys, params);

                /*
                //обновляем html
                var html = this.createHistoryRow(params);
                $('.hotHistory span').after(html);
                $('.hotHistory').show();
                */
            }

            if (count(sKeys) > 5) {
                // удаляем последний
                for (kk in sKeys) {}
                // в kk будет лежать последний индекс
                delete sKeys[kk];
            }
            ls.setItem('search', JSON.stringify(sKeys));
            // if (ins) this._initializeHistory();	//перерисовываем элементы
        }
    }, {
        key: 'addHistoryElem',
        value: function addHistoryElem(sKeys, item) {
            var tmp = {};
            var k = this.generateHistoryKey();
            tmp[k] = item;
            for (var t in sKeys) {
                tmp[t] = sKeys[t];
            }
            return JSON.parse(JSON.stringify(tmp));
        }
    }, {
        key: 'generateHistoryHash',
        value: function generateHistoryHash(params) {
            var h = '';
            h += 'city=' + params.departCity;
            h += 'country=' + params.country;
            h += 'region=' + params.region;
            h += 'date=' + params.dateFrom;
            h += 'dateDelta=' + params.delta;
            h += 'nightsFrom=' + params.nightsFrom;
            h += 'nightsTo=' + params.nightsTo;
            h += 'stars=' + params.stars;
            h += 'adult=' + params.adult;
            h += 'child=' + params.child;
            h += 'ch1' + params.ch1;
            h += 'ch2' + params.ch2;
            h += 'hotel' + params.hotel;

            return hex_md5(h);
        }
    }, {
        key: 'generateHistoryKey',
        value: function generateHistoryKey() {
            if (!isLocalStorageNameSupported()) {
                return '';
            }
            var f = 1
              , key = '';
            while (f) {
                var k = window.localStorage.getItem('search');
                var sKeys = {};
                if (k != null) {
                    sKeys = JSON.parse(k);
                }

                key = 'k' + (Math.floor(Math.random() * 1000) + 1);
                if (key in sKeys == false) {
                    f = 0;
                }
            }
            return key;
        }
        // установка места назначения

    }, {
        key: 'setArrivalPlace',
        value: function setArrivalPlace(params) {
            var $elem = params.elem
              , ui = this.elems.country
              , force_city = null
              , value = params.country
              , country = params.country;

            if (params.hasOwnProperty('hotelId')) {
                value = params.hotelId;
            } else if (params.hasOwnProperty('regionId')) {
                value = params.regionId;
            }

            if (!this.data[this.city_id].countries.hasOwnProperty(country) && this.countries.hasOwnProperty(country)) {
                // если нет вылета из текущего города вылета
                force_city = this.countries[country].city_id;
            }

            this.onCountryChange(value, ui, $elem, force_city);
        }
        // поиск

    }, {
        key: 'startSearch',
        value: function startSearch(options, saveGlobalParams) {
            var _checkParams = this.checkParams(true)
              , valid = _checkParams.f
              , params = _checkParams.params;

            if (!options) {
                options = {};
            }
            if (valid) {
                var searchEvent = new CustomEvent('search:start-new',{
                    detail: {
                        formParams: params,
                        // Поиск проживания
                        isOnlyHotels: this.mode === SEARCH_TYPE_HOTELS,
                        isSplitRooms: !!this.splitRooms
                    }
                });
                window.dispatchEvent(searchEvent);

                if (!options.addToPrev) {
                    // TODO: check this.setHotTableTourViewUrlParams($hotTable);
                    this.refreshQuery();
                }
            }
        }
    }, {
        key: 'setDateFrom',
        value: function setDateFrom(date, inst) {
            this.dateFrom = moment([inst.selectedYear, inst.selectedMonth, parseInt(inst.selectedDay, 10)]);
            $('#w-st-date-range-from .h-select-face').html('c ' + this.dateFrom.format('D.MM'));
            var $dateTo = $('#w-st-datepicker-range-to_container');
            var nextDate = this.dateFrom.clone().add(1, 'd');
            $dateTo.datepicker('option', 'minDate', nextDate.toDate());
            if (this.dateTo && nextDate.isAfter(this.dateTo)) {
                this.setDateTo(nextDate, null);
            }
            if (this.elems.dateTo) {
                this.elems.dateTo.show();
                this.elems.dateFrom.hide();
            }

            this.changeHiddenValue('sfHiddenDateFrom', this.dateFrom.format('D.M.YYYY'));
        }
    }, {
        key: 'setDateTo',
        value: function setDateTo(date, inst) {
            this.dateTo = moment.isMoment(date) ? date : moment([inst.selectedYear, inst.selectedMonth, parseInt(inst.selectedDay, 10)]);
            $('#w-st-date-range-to .h-select-face').html('по ' + this.dateTo.format('D.MM'));
            this.elems.dateTo.hide();
            this.changeHiddenValue('sfHiddenDateTo', this.dateTo.format('D.M.YYYY'));
        }
        /**
         *
         * @param val {boolean}
         */

    }, {
        key: 'setSplitRoomsVal',
        value: function setSplitRoomsVal(val) {
            this.changeHiddenValue('sfHiddenSplitRooms', val ? '1' : '0');
            this.splitRooms = val;
        }
    }, {
        key: 'toggleSplitRoomsCheckbox',
        value: function toggleSplitRoomsCheckbox() {
            var show = isEnoughPeopleToSplitRoom(this.adult, this.child);

            if (this.elems.splitRooms.hidden === show) {
                this.elems.splitRooms.$wrapper.css('display', show ? 'block' : 'none');
                if (!this.splitRoomsValueIsSetFromUrl) {
                    if (show) {
                        this.setSplitRoomsVal(true);
                        this.elems.splitRooms.$checkBox.prop('checked', true);
                    } else {
                        // если людей не достаточно, то и флаг снимем
                        this.setSplitRoomsVal(false);
                        this.elems.splitRooms.$checkBox.prop('checked', false);
                    }
                }
                this.elems.splitRooms.hidden = !show;
            }
        }
        // TODO: check

    }, {
        key: 'setHotTableTourViewUrlParams',
        value: function setHotTableTourViewUrlParams($hotTable) {
            if (!$hotTable.hasClass('ht_results_wrap')) {
                return false;
            }

            // $hotTable.hotTable('setTourViewUrlParams', this.getTourViewUrlParamsAsString());
            return true;
        }
    }, {
        key: 'getTourViewUrlParamsAsString',

        /**
         * @return {string}
         */
        value: function getTourViewUrlParamsAsString() {
            var urlParams = [];

            var formValues = this.element.find('form').serializeArray();
            // Для поиска туров dateFrom + delta, для проживания dateFrom + dateTo
            var allowedFields = ['nightsFrom', 'nightsTo', 'dateFrom', 'delta', 'dateTo'];
            // Это все есть в туре или не используется. Исключаем
            // excluded: ['departCity', 'country', 'region', 'hotel', 'stars', 'search', 'splitRooms',  'adult', 'child', 'childAges', delta, ...]
            for (var i = 0; i < formValues.length; i++) {
                if (allowedFields.indexOf(formValues[i].name) !== -1) {
                    urlParams.push(formValues[i].name + '=' + formValues[i].value);
                }
            }

            return urlParams.join('&');
        }
    }]);

    return SearchForm;
}();
